import { TenantForm } from '@/components/tenants/tenant-form';

export default function NewTenantPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Create tenant</h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Set up a new organisation on the Spancle platform.
        </p>
      </div>
      <TenantForm mode="create" />
    </div>
  );
}
