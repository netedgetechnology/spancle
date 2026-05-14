"use strict";
/**
 * @spancle/ui-kit — Accessible, headless UI component library.
 *
 * Built on Radix UI primitives with Tailwind CSS styling via CVA variants.
 *
 * IMPORTANT — consuming app Tailwind config must include:
 *   content: [
 *     './src/**\/*.{ts,tsx}',
 *     '../../packages/ui-kit/src/**\/*.{ts,tsx}',
 *   ]
 *
 * All interactive components are Client Components ('use client').
 * Display-only components (Card, Badge, Table) are RSC-safe.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = exports.useDebounce = exports.useDisclosure = exports.useToast = exports.ToastProvider = exports.Toast = exports.TableCaption = exports.TableCell = exports.TableHead = exports.TableRow = exports.TableFooter = exports.TableBody = exports.TableHeader = exports.Table = exports.Select = exports.Modal = exports.CardFooter = exports.CardContent = exports.CardDescription = exports.CardTitle = exports.CardHeader = exports.Card = exports.badgeVariants = exports.Badge = exports.Input = exports.buttonVariants = exports.Button = void 0;
// ── Components ────────────────────────────────────────────────────────────────
var button_1 = require("./components/button/button");
Object.defineProperty(exports, "Button", { enumerable: true, get: function () { return button_1.Button; } });
Object.defineProperty(exports, "buttonVariants", { enumerable: true, get: function () { return button_1.buttonVariants; } });
var input_1 = require("./components/input/input");
Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return input_1.Input; } });
var badge_1 = require("./components/badge/badge");
Object.defineProperty(exports, "Badge", { enumerable: true, get: function () { return badge_1.Badge; } });
Object.defineProperty(exports, "badgeVariants", { enumerable: true, get: function () { return badge_1.badgeVariants; } });
var card_1 = require("./components/card/card");
Object.defineProperty(exports, "Card", { enumerable: true, get: function () { return card_1.Card; } });
Object.defineProperty(exports, "CardHeader", { enumerable: true, get: function () { return card_1.CardHeader; } });
Object.defineProperty(exports, "CardTitle", { enumerable: true, get: function () { return card_1.CardTitle; } });
Object.defineProperty(exports, "CardDescription", { enumerable: true, get: function () { return card_1.CardDescription; } });
Object.defineProperty(exports, "CardContent", { enumerable: true, get: function () { return card_1.CardContent; } });
Object.defineProperty(exports, "CardFooter", { enumerable: true, get: function () { return card_1.CardFooter; } });
var modal_1 = require("./components/modal/modal");
Object.defineProperty(exports, "Modal", { enumerable: true, get: function () { return modal_1.Modal; } });
var select_1 = require("./components/select/select");
Object.defineProperty(exports, "Select", { enumerable: true, get: function () { return select_1.Select; } });
var table_1 = require("./components/table/table");
Object.defineProperty(exports, "Table", { enumerable: true, get: function () { return table_1.Table; } });
Object.defineProperty(exports, "TableHeader", { enumerable: true, get: function () { return table_1.TableHeader; } });
Object.defineProperty(exports, "TableBody", { enumerable: true, get: function () { return table_1.TableBody; } });
Object.defineProperty(exports, "TableFooter", { enumerable: true, get: function () { return table_1.TableFooter; } });
Object.defineProperty(exports, "TableRow", { enumerable: true, get: function () { return table_1.TableRow; } });
Object.defineProperty(exports, "TableHead", { enumerable: true, get: function () { return table_1.TableHead; } });
Object.defineProperty(exports, "TableCell", { enumerable: true, get: function () { return table_1.TableCell; } });
Object.defineProperty(exports, "TableCaption", { enumerable: true, get: function () { return table_1.TableCaption; } });
var toast_1 = require("./components/toast/toast");
Object.defineProperty(exports, "Toast", { enumerable: true, get: function () { return toast_1.Toast; } });
Object.defineProperty(exports, "ToastProvider", { enumerable: true, get: function () { return toast_1.ToastProvider; } });
Object.defineProperty(exports, "useToast", { enumerable: true, get: function () { return toast_1.useToast; } });
// ── Hooks ─────────────────────────────────────────────────────────────────────
var use_disclosure_1 = require("./hooks/use-disclosure");
Object.defineProperty(exports, "useDisclosure", { enumerable: true, get: function () { return use_disclosure_1.useDisclosure; } });
var use_debounce_1 = require("./hooks/use-debounce");
Object.defineProperty(exports, "useDebounce", { enumerable: true, get: function () { return use_debounce_1.useDebounce; } });
// ── Utilities ─────────────────────────────────────────────────────────────────
var cn_1 = require("./lib/cn");
Object.defineProperty(exports, "cn", { enumerable: true, get: function () { return cn_1.cn; } });
//# sourceMappingURL=index.js.map