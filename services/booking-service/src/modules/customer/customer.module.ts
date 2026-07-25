import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity }     from './entities/customer.entity';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerService }    from './services/customer.service';
import { CustomerController } from './controllers/customer.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([CustomerEntity])],
  controllers: [CustomerController],
  providers:   [CustomerRepository, CustomerService],
  exports:     [CustomerService],
})
export class CustomerModule {}
