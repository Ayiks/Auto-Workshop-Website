import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Phone, CheckCircle, Clock, AlertCircle, XCircle, Info } from 'lucide-react';
import { settingsApi } from '@api/settings';
import Button from '@components/common/Button';
import LoadingSpinner from '@components/common/LoadingSpinner';

const WHATSAPP_STATUS = {
  unregistered: { label: 'Not Registered', color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle },
  pending:       { label: 'Pending Activation', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  active:        { label: 'Active', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  failed:        { label: 'Registration Failed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
};

export default function MessagingSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  const settings = settingsResponse?.data;

  const [formData, setFormData] = useState({
    arkeselSenderId: '',
    arkeselWhatsAppSenderId: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        arkeselSenderId: settings.arkeselSenderId || '',
        arkeselWhatsAppSenderId: settings.arkeselWhatsAppSenderId || '',
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['business-settings']);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const registerMutation = useMutation({
    mutationFn: settingsApi.registerWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries(['business-settings']);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      arkeselSenderId: formData.arkeselSenderId,
      arkeselWhatsAppSenderId: formData.arkeselWhatsAppSenderId,
    });
  };

  const handleCancel = () => {
    setFormData({
      arkeselSenderId: settings?.arkeselSenderId || '',
      arkeselWhatsAppSenderId: settings?.arkeselWhatsAppSenderId || '',
    });
    setIsEditing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  const whatsappStatus = settings?.whatsappStatus || 'unregistered';
  const statusInfo = WHATSAPP_STATUS[whatsappStatus] || WHATSAPP_STATUS.unregistered;
  const StatusIcon = statusInfo.icon;
  const senderIdLength = formData.arkeselSenderId.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">Messaging Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your SMS sender name and WhatsApp Business number to send messages to your customers.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Messaging settings saved successfully.
        </div>
      )}

      {updateMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {updateMutation.error?.response?.data?.message || 'Failed to save settings. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SMS Section */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">SMS</h3>
              <p className="text-xs text-gray-500">Sender name shown on text messages</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">SMS Sender ID</label>
              {senderIdLength > 0 && senderIdLength <= 11 && (
                <span className="text-xs text-gray-400">{senderIdLength}/11 chars</span>
              )}
            </div>
            <input
              type="text"
              name="arkeselSenderId"
              value={formData.arkeselSenderId}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. AutoShop or +233241234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter a sender name (max 11 characters, no spaces) <em>or</em> your business phone number in international format (e.g. +233241234567). Using your phone number lets customers reply to your SMS.
            </p>
          </div>
        </div>

        {/* WhatsApp Section */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Phone className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">WhatsApp Business</h3>
                <p className="text-xs text-gray-500">Your registered WhatsApp Business number</p>
              </div>
            </div>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              WhatsApp Business Number
            </label>
            <input
              type="text"
              name="arkeselWhatsAppSenderId"
              value={formData.arkeselWhatsAppSenderId}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="e.g. +233241234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              International format, e.g. +233241234567. Must be a registered WhatsApp Business number.
            </p>
          </div>

          {/* Activate button — shown when number is set but not active */}
          {!isEditing && settings?.arkeselWhatsAppSenderId && whatsappStatus !== 'active' && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => registerMutation.mutate()}
                loading={registerMutation.isPending}
                disabled={registerMutation.isPending || whatsappStatus === 'pending'}
                className="border-green-300 text-green-700 hover:bg-green-50 text-sm"
              >
                {whatsappStatus === 'pending' ? 'Activation Pending…' : 'Activate WhatsApp'}
              </Button>
              {whatsappStatus === 'pending' && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Check your WhatsApp for an OTP from Arkesel to complete activation.
                </p>
              )}
              {registerMutation.isError && (
                <p className="text-xs text-red-600 mt-1.5">
                  {registerMutation.error?.response?.data?.message || 'Registration failed. Try again.'}
                </p>
              )}
              {registerMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-1.5">
                  Registration submitted. Check WhatsApp for your OTP.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Edit Settings
            </Button>
          ) : (
            <>
              <Button type="submit" variant="primary" loading={updateMutation.isPending}
                className="bg-black hover:bg-gray-800 text-white">
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </Button>
            </>
          )}
        </div>
      </form>

      {/* Info box */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs text-blue-700">
          <p className="font-semibold">How messaging works</p>
          <ul className="space-y-1">
            <li>• SMS and WhatsApp messages are sent via the platform's shared Arkesel account.</li>
            <li>• Your SMS sender name (max 11 chars) identifies your business on text messages.</li>
            <li>• To send WhatsApp messages, enter your business number and click <strong>Activate WhatsApp</strong>. Arkesel will send you an OTP to verify ownership.</li>
            <li>• Once active, you can send WhatsApp reminders and broadcast messages to customers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
