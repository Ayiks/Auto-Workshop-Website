import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';


// @desc    Register a new business, choose plan, and create admin
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, businessName, selectedPlan } = req.body;

  // 1. Validate required fields
  if (!fullName || !email || !password || !businessName) {
    throw new AppError('Please provide all required fields', 400, 'VALIDATION_ERROR');
  }

  // Ensure they picked a valid plan (default to free)
  const plan = selectedPlan === 'pro' ? 'pro' : 'free';

  // 2. Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: { 
      OR: [{ email }, { username: email }]
    }
  });

  if (existingUser) {
    throw new AppError('An account with this email already exists', 400, 'DUPLICATE_ENTRY');
  }

  // 3. Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Create Business AND Admin User in one transaction
  const result = await prisma.$transaction(async (tx) => {
    
    // A. Create the Business Workspace
    const newBusiness = await tx.business.create({
      data: {
        name: businessName,
        plan: plan,
        subscriptionStatus: 'active', // Active immediately for free plan
      }
    });

    // B. Create the Admin User tied to the new Business
    const newUser = await tx.user.create({
      data: {
        fullName,
        email,
        username: email, // Defaulting username to email for login
        phone,
        passwordHash: hashedPassword,
        role: 'admin',
        businessId: newBusiness.id, // Linked!
        isActive: true,
        permissions: { "all": ["manage"] } 
      }
    });

    return { business: newBusiness, user: newUser };
  });

  // 5. Initialize default settings in their new isolated sandbox
  const db = getTenantDB(result.business.id);
  await db.businessSettings.create({
    data: {
      name: businessName,
      email: email,
      phone: phone || '',
      address: 'Please update your address in settings',
    }
  });

  // 6. Generate login token
  const token = generateToken(result.user);

  // 7. Send response
  res.status(201).json({
    success: true,
    token,
    data: {
      id: result.user.id,
      fullName: result.user.fullName,
      email: result.user.email,
      role: result.user.role,
      businessId: result.business.id,
      businessName: result.business.name,
      plan: result.business.plan
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