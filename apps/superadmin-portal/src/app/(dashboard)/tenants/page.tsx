export default function TenantsPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage all platform tenants</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center">
        <p className="text-sm font-medium text-gray-400">Tenant management — coming in Sprint 4</p>
      </div>
    </div>
  );
}
