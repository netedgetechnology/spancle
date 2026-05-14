"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputVariants = void 0;
const class_variance_authority_1 = require("class-variance-authority");
exports.inputVariants = (0, class_variance_authority_1.cva)([
    'flex w-full rounded-md border bg-white px-3 font-normal text-gray-900',
    'placeholder:text-gray-400',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
    'read-only:bg-gray-50',
], {
    variants: {
        intent: {
            default: [
                'border-gray-300',
                'hover:border-gray-400',
                'focus:border-primary-500 focus:ring-primary-200',
            ],
            error: [
                'border-red-400 bg-red-50',
                'hover:border-red-500',
                'focus:border-red-500 focus:ring-red-200',
            ],
            success: [
                'border-green-400',
                'focus:border-green-500 focus:ring-green-200',
            ],
        },
        size: {
            sm: 'h-8  text-sm',
            md: 'h-9  text-sm',
            lg: 'h-10 text-base',
        },
    },
    defaultVariants: {
        intent: 'default',
        size: 'md',
    },
});
//# sourceMappingURL=input.variants.js.map