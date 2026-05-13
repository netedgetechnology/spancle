import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletRepository } from '../repositories/wallet.repository';
import { WalletEvents } from '../events/wallet.events';
import type { CreateWalletDto } from '../dto/create-wallet.dto';
import type { UpdateWalletDto } from '../dto/update-wallet.dto';
import type { WalletEntity } from '../entities/wallet.entity';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateWalletDto, tenantId: string): Promise<WalletEntity> {
    this.logger.log(`Creating wallet -- tenant: ${tenantId}`);
    const entity = await this.walletRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(WalletEvents.CREATED, { tenantId, walletId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<WalletEntity[]> {
    return this.walletRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<WalletEntity> {
    const entity = await this.walletRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Wallet not found');
    return entity;
  }

  async update(id: string, dto: UpdateWalletDto, tenantId: string): Promise<WalletEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.walletRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(WalletEvents.UPDATED, { tenantId, walletId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.walletRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(WalletEvents.DELETED, { tenantId, walletId: id });
  }
}
