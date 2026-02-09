import type { AuditChanges, AuditAction } from '@/types/audit';

interface AuditChangesDisplayProps {
  changes: AuditChanges | null;
  action: AuditAction;
}

export function AuditChangesDisplay({ changes, action }: AuditChangesDisplayProps) {
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-gray-500 text-sm">Tidak ada perubahan</span>;
  }

  // Check if it's a password change - hide sensitive data
  if (action === 'CHANGE_PASSWORD' || 'currentPassword' in changes || 'newPassword' in changes) {
    return (
      <div className="text-sm">
        <div className="font-medium text-blue-700 mb-1">Password Diubah</div>
        <p className="text-gray-600 text-xs">Password berhasil diperbarui (detail disembunyikan untuk keamanan)</p>
      </div>
    );
  }

  // For CREATE action
  if (action === 'CREATE') {
    return (
      <div className="text-sm">
        <div className="font-medium text-green-700 mb-1">Data Dibuat:</div>
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <dl className="space-y-1">
            {Object.entries(changes).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-xs font-semibold text-green-900">{key}:</dt>
                <dd className="text-xs text-gray-700 ml-2">
                  {typeof value === 'object' && value !== null 
                    ? <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  // For UPDATE action
  if (action === 'UPDATE') {
    return (
      <div className="text-sm">
        <div className="font-medium text-blue-700 mb-1">Perubahan Data:</div>
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <dl className="space-y-1">
            {Object.entries(changes).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-xs font-semibold text-blue-900">{key}:</dt>
                <dd className="text-xs text-gray-700 ml-2">
                  {typeof value === 'object' && value !== null 
                    ? <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  // For DELETE action
  if (action === 'DELETE') {
    return (
      <div className="text-sm">
        <div className="font-medium text-red-700 mb-1">Data Dihapus:</div>
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <dl className="space-y-1">
            {Object.entries(changes).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-xs font-semibold text-red-900">{key}:</dt>
                <dd className="text-xs text-gray-700 ml-2">
                  {typeof value === 'object' && value !== null 
                    ? <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="text-sm">
      <div className="font-medium text-gray-700 mb-1">Perubahan:</div>
      <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto border border-gray-200">
        {JSON.stringify(changes, null, 2)}
      </pre>
    </div>
  );
}
