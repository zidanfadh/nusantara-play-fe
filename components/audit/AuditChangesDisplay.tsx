import type { AuditChanges } from '@/types/audit';

interface AuditChangesDisplayProps {
  changes: AuditChanges | null;
}

export function AuditChangesDisplay({ changes }: AuditChangesDisplayProps) {
  if (!changes) {
    return <span className="text-gray-500 text-sm">Tidak ada perubahan</span>;
  }

  // Check if it's a create operation
  if ('created' in changes) {
    return (
      <div className="text-sm">
        <div className="font-medium text-green-700 mb-1">Data Dibuat:</div>
        <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(changes.created, null, 2)}
        </pre>
      </div>
    );
  }

  // Check if it's an update operation
  if ('before' in changes && 'after' in changes) {
    return (
      <div className="text-sm space-y-2">
        <div>
          <div className="font-medium text-red-700 mb-1">Sebelum:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(changes.before, null, 2)}
          </pre>
        </div>
        <div>
          <div className="font-medium text-blue-700 mb-1">Sesudah:</div>
          <pre className="bg-blue-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(changes.after, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // Check if it's a delete operation
  if ('deleted' in changes) {
    return (
      <div className="text-sm">
        <div className="font-medium text-red-700 mb-1">Data Dihapus:</div>
        <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(changes.deleted, null, 2)}
        </pre>
      </div>
    );
  }

  return <span className="text-gray-500 text-sm">Format tidak dikenal</span>;
}
