import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { LessThan, Repository } from 'typeorm';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { User } from 'src/users/entities/user.entity';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { GetPaymentsOutput } from './dtos/get-payments.dto';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
    try {
      const date = new Date();
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

      restaurant.isPromoted = true;
      // 한번 프로모션을 구매하면 7일간 진행
      date.setDate(date.getDate() + 7);
      restaurant.promotedUntil = date;
      await this.restaurants.save(restaurant);

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

  // 매일 아침 6시에 이 작업을 수행
  @Cron('0 0 6 * * *')
  async checkPromotedRetaurants() {
    const restaurants = await this.restaurants.find({
      where: {
        // 프로모션날짜가 지냈음에도 계속 프로모션되는 가게만 찾는다.
        isPromoted: true,
        promotedUntil: LessThan(new Date()),
      },
    });
    console.log(restaurants);
    restaurants.forEach(async (restaurant) => {
      restaurant.isPromoted = false;
      restaurant.promotedUntil = null;
      await this.restaurants.save(restaurant);
    });
  }
}
