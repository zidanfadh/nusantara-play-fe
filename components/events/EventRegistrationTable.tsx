import { EventRegistration, REGISTRATION_STATUS_LABELS, RegistrationStatus } from '@/types/events';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface EventRegistrationTableProps {
  registrations: EventRegistration[];
  onCheckIn: (userId: string) => Promise<void>;
  onUndoCheckIn: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

export function EventRegistrationTable({
  registrations,
  onCheckIn,
  onUndoCheckIn,
  isLoading = false,
}: EventRegistrationTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.REGISTERED:
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Terdaftar</span>;
      case RegistrationStatus.CHECKED_IN:
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Check-in</span>;
      case RegistrationStatus.CANCELLED:
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Dibatalkan</span>;
    }
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">Belum ada peserta yang mendaftar</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Peserta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tanggal Daftar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {registrations.map((registration, index) => (
              <tr key={registration.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {registration.user?.full_name || registration.data_pendaftaran?.nama || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {registration.user?.email || registration.data_pendaftaran?.email || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(registration.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(registration.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {registration.checked_in_at ? formatDate(registration.checked_in_at) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {registration.status === RegistrationStatus.REGISTERED && (
                    <button
                      onClick={() => onCheckIn(registration.user_id)}
                      disabled={isLoading}
                      className="inline-flex items-center text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      Check-in
                    </button>
                  )}
                  {registration.status === RegistrationStatus.CHECKED_IN && (
                    <button
                      onClick={() => onUndoCheckIn(registration.user_id)}
                      disabled={isLoading}
                      className="inline-flex items-center text-orange-600 hover:text-orange-900 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5 mr-1" />
                      Batal Check-in
                    </button>
                  )}
                  {registration.status === RegistrationStatus.CANCELLED && (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">Total Peserta: <strong>{registrations.length}</strong></span>
          <div className="flex space-x-4">
            <span className="text-blue-700">
              Terdaftar: <strong>{registrations.filter(r => r.status === RegistrationStatus.REGISTERED).length}</strong>
            </span>
            <span className="text-green-700">
              Check-in: <strong>{registrations.filter(r => r.status === RegistrationStatus.CHECKED_IN).length}</strong>
            </span>
            <span className="text-red-700">
              Dibatalkan: <strong>{registrations.filter(r => r.status === RegistrationStatus.CANCELLED).length}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
