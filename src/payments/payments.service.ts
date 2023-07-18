import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { User } from 'src/users/entities/user.entity';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { GetPaymentsOutput } from './dtos/get-payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
  ) {}

  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
    try {
      const restaurant = await this.restaurants.findOneBy({ id: restaurantId });
      if (!restaurant) {
        return {
          ok: false,
          error: '존재하지 않는 레스토랑입니다.',
        };
      }

      if (restaurant.ownerId) {
        if (restaurant.ownerId !== owner.id) {
          return {
            ok: false,
            error: '이 서비스에 접근할 권한이 없습니다.',
          };
        }
      }
      await this.payments.save(
        this.payments.create({ user: owner, restaurant, transactionId }),
      );
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '이 레스토랑을 프로모션하는데 실패했습니다.',
      };
    }
  }

  async getPayments(user: User): Promise<GetPaymentsOutput> {
    try {
      const payments = await this.payments.find({
        // where 를 쓰면 payment table 에 있는 내용만 온다
        where: {
          user: {
            id: user.id,
          },
        },
        // relations 를 쓰면 user, restaurant 정보가 모두 온다.
        // relations: { user: true },
      });

      if (!payments) {
        return {
          ok: false,
          error: '존재하지 않는 프로모션입니다.',
        };
      }
      return {
        ok: true,
        payments,
      };
    } catch {
      return {
        ok: false,
        error: '프로모션내용을 읽어오는데 실패했습니다.',
      };
    }
  }
}
