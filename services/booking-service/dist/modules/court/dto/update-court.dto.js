"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCourtDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const mapped_types_2 = require("@nestjs/mapped-types");
const create_court_dto_1 = require("./create-court.dto");
class UpdateCourtDto extends (0, mapped_types_1.PartialType)((0, mapped_types_2.OmitType)(create_court_dto_1.CreateCourtDto, ['venueId', 'branchId'])) {
}
exports.UpdateCourtDto = UpdateCourtDto;
//# sourceMappingURL=update-court.dto.js.map