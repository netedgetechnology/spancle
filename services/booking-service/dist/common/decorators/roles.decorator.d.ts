import type { SystemRole } from '@spancle/types';
export declare const ROLES_KEY: "spancle:roles";
export declare const IS_PUBLIC_KEY: "spancle:is_public";
export declare const ACTOR_KEY: "spancle:actor";
export declare const Roles: (...roles: (SystemRole | string)[]) => MethodDecorator & ClassDecorator;
export declare const Public: () => MethodDecorator & ClassDecorator;
//# sourceMappingURL=roles.decorator.d.ts.map