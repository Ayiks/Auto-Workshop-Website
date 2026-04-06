import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma, { getTenantDB } from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';
import { sendVerificationEmail } from "../utils/sendEmail.js";



// @desc    Register a new business, choose plan, and create admin
// @route   POST /api/auth/register
// @access  Public
// export const register = asyncHandler(async (req, res) => {
//   const { fullName, email, phone, password, businessName, selectedPlan } = req.body;

//   // 1. Validate required fields
//   if (!fullName || !email || !password || !businessName) {
//     throw new AppError('Please provide all required fields', 400, 'VALIDATION_ERROR');
//   }

//   // Ensure they picked a valid plan (default to free)
//   const plan = selectedPlan === 'pro' ? 'pro' : 'free';

//   // 2. Check if user already exists
//   const existingUser = await prisma.user.findFirst({
//     where: { 
//       OR: [{ email }, { username: email }]
//     }
//   });

//   if (existingUser) {
//     throw new AppError('An account with this email already exists', 400, 'DUPLICATE_ENTRY');
//   }

//   // 3. Hash the password
//   const hashedPassword = await bcrypt.hash(password, 12);

//   // 4. Create Business AND Admin User in one transaction
//   const result = await prisma.$transaction(async (tx) => {

//     // A. Create the Business Workspace
//     const newBusiness = await tx.business.create({
//       data: {
//         name: businessName,
//         plan: plan,
//         subscriptionStatus: 'active', // Active immediately for free plan
//       }
//     });

//     // B. Create the Admin User tied to the new Business
//     const newUser = await tx.user.create({
//       data: {
//         fullName,
//         email,
//         username: email, // Defaulting username to email for login
//         phone,
//         passwordHash: hashedPassword,
//         role: 'admin',
//         businessId: newBusiness.id, // Linked!
//         isActive: true,
//         permissions: { "all": ["manage"] } 
//       }
//     });

//     return { business: newBusiness, user: newUser };
//   });

//   // 5. Initialize default settings in their new isolated sandbox
//   const db = getTenantDB(result.business.id);
//   await db.businessSettings.create({
//     data: {
//       name: businessName,
//       email: email,
//       phone: phone || '',
//       address: 'Please update your address in settings',
//     }
//   });

//   // 6. Generate login token
//   const token = generateToken(result.user);

//   // 7. Send response
//   res.status(201).json({
//     success: true,
//     token,
//     data: {
//       id: result.user.id,
//       fullName: result.user.fullName,
//       email: result.user.email,
//       role: result.user.role,
//       businessId: result.business.id,
//       businessName: result.business.name,
//       plan: result.business.plan
//     }
//   });
// });

// 1. STEP ONE: Create Account & Send Email
export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) throw new AppError('Please provide all required fields', 400);

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) throw new AppError('Email already in use', 400);

  // Generate a random token for the email link
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create User WITHOUT a business yet
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      username: email,
      phone,
      passwordHash: hashedPassword,
      role: 'admin',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      verificationTokenExpiry: tokenExpiry,
      permissions: { "all": ["manage"] }
    }
  });

  // Send the email
  await sendVerificationEmail(user.email, user.fullName, verificationToken);

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email for the verification link.'
  });
});

// 2. STEP TWO: User Clicks Link -> Verify & Log Them In
export const verifyEmail = asyncHandler(async (req, res) => {
  // 1. Grab the token and clean it up (removes accidental spaces from URL parsing)
  const rawToken = req.params.token;
  if (!rawToken) throw new AppError('No token provided', 400);

  const token = rawToken.trim();

  // 2. Use findFirst to avoid Prisma @unique crashing bugs
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token }
  });

  // 3. Detailed error handling so we know EXACTLY what failed
  if (!user) {
    throw new AppError('Invalid token: This link has already been used or does not exist.', 400);
  }

  // 4. Safe Date check (checking if the token is older than the expiry)
  if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
    throw new AppError('This verification link has expired. Please sign up again.', 400);
  }

  // 5. Update user as verified, but DO NOT delete the token yet!
  // (We delete it in setupWorkspace so they can safely refresh the page)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      // intentionally leaving emailVerificationToken alone for now
    }
  });

  // 6. Generate the JWT 
  const authToken = generateToken(updatedUser);

  res.status(200).json({
    success: true,
    token: authToken,
    message: 'Email verified successfully!',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      businessId: updatedUser.businessId
    }
  });
});

// 3. STEP THREE: Setup the Workspace (Requires the User to be logged in via JWT)
export const setupWorkspace = asyncHandler(async (req, res) => {
  const { businessName, plan = 'free', enabledJobTypes, logo, address, phone, email, arkeselSenderId, smsEnabled } = req.body;
  const userId = req.user.id; // From your JWT auth middleware

  if (!businessName) throw new AppError('Business name is required', 400);

  // Check if they already have a workspace to prevent duplicates
  if (req.user.businessId) throw new AppError('You already have a workspace', 400);

  const result = await prisma.$transaction(async (tx) => {
    // A. Create the Business
    const newBusiness = await tx.business.create({
      data: {
        name: businessName,
        plan: plan,
        subscriptionStatus: 'active',
      }
    });

    // B. Attach the Business ID to the User
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        businessId: newBusiness.id, emailVerificationToken: null,
        verificationTokenExpiry: null
      }
    });

    return { business: newBusiness, user: updatedUser };
  });

  // C. Initialize default settings using the new Tenant ID
  const db = getTenantDB(result.business.id);
  await db.businessSettings.create({
    data: {
      name: businessName,
      logo: logo?.trim() || null,
      email: email?.trim() || req.user.email,
      phone: phone?.trim() || req.user.phone || '',
      address: address?.trim() || 'Please update your address in settings',
      arkeselSenderId: arkeselSenderId?.trim() || null,
      smsEnabled: smsEnabled ?? false,
      enabledJobTypes: Array.isArray(enabledJobTypes) && enabledJobTypes.length
        ? enabledJobTypes
        : ['mechanic', 'sprayer', 'bodyworks', 'other'],
    }
  });

  // Since the user now has a business ID, generate a NEW JWT token for them 
  // so the frontend knows their new business context.
  // const finalToken = generateToken({ id: result.user.id, role: result.user.role, businessId: result.business.id });
  const finalToken = generateToken(result.user);

  res.status(201).json({
    success: true,
    token: finalToken,
    message: 'Workspace created successfully!',
    data: {
      id: result.user.id,
      fullName: result.user.fullName,
      email: result.user.email,
      username: result.user.username,
      role: result.user.role,
      businessId: result.business.id,
      businessName: result.business.name,
      permissions: result.user.permissions,
      isActive: result.user.isActive,
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    throw new AppError('Please provide username and password', 400, 'VALIDATION_ERROR');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Generate token
  const token = generateToken(user);

  // Remove sensitive data
  const { passwordHash, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userWithoutPassword,
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  res.json({
    success: true,
    user,
  });
});



// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide current and new password', 400, 'VALIDATION_ERROR');
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: hashedPassword },
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone } = req.body;

  // 1. Validation (Optional: Check if email is valid, etc.)

  // 2. Prepare data object
  const updateData = {};
  if (fullName !== undefined) updateData.fullName = fullName?.trim();
  if (email !== undefined) updateData.email = email?.trim();
  if (phone !== undefined) updateData.phone = phone?.trim();

  // 3. Update using req.user.id (from the auth token middleware)
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      permissions: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user, // Send back the updated user object to update local state
    token,  // Send back a new token in case user info in token payload is used
  });
});