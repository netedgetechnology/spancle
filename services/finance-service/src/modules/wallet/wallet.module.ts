import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity])],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService],
})
export class WalletModule {}
