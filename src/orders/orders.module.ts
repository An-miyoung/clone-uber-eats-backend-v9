import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderResolver } from './orders.resolver';
import { OrderService } from './orders.service';
import { Order } from './entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [OrderResolver, OrderService],
})
export class OrdersModule {}
