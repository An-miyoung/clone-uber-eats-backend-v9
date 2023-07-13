import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { OrderItem } from './entities/order-item.entity';
import { Dish } from 'src/restaurant/entities/dish.entity';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOneBy({
        id: restaurantId,
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '해당 레스토랑이 존재하지 않습니다.',
        };
      }
      // items.forEach(async (item) => {} 로 dish 를 찾고 dish 가 없을 경우,
      // return {
      // ok: false,
      // error: '해당 메뉴가 존재하지 않습니다.',
      // } 를 해도 graphQl resolver 가 프로세스를 종료하지 못한다.
      //   forEach 안에서 돌고 있기 때문. 그래서 for of 사용
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOneBy({ id: item.dishId });
        if (!dish) {
          return {
            ok: false,
            error: '해당 메뉴가 존재하지 않습니다.',
          };
        }
        // 각 item 의 option 이름을 갖고, Dish option의 이름과 비교후 extraPrice 를 가져온다.
        // 고객이 직접 가격을 입력하지 않으니까
        // order는 한 고객이 여러주문을 넣을 수 있기때문에 items가 여러개. 이것을 배열화
        // 고객이 주문한 items 라는 큰 배열속에 options 라는 배열을 품고 있어서 loop 를 돌리며 비교
        let dishFinalPrice = dish.price;
        for (const itemOtion of item.options) {
          const dishOption = dish.options.find(
            (dishOption) => itemOtion.name === dishOption.name,
          );
          if (dishOption) {
            if (dishOption.extraPrice) {
              dishFinalPrice += dishOption.extraPrice;
            } else {
              const dishoptionChioce = dishOption.choices.find(
                (choice) => choice.name === itemOtion.choice,
              );
              if (dishoptionChioce && dishoptionChioce.extraPrice) {
                dishFinalPrice += dishoptionChioce.extraPrice;
              }
            }
          }
        }
        orderFinalPrice += dishFinalPrice;

        const orderItem = await this.orderItems.save(
          this.orderItems.create({ dish, options: item.options }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          items: orderItems,
          totalPrice: orderFinalPrice,
        }),
      );

      return {
        ok: true,
        orderId: order.id,
      };
    } catch {
      return {
        ok: false,
        error: '주문생성에 실패했습니다.',
      };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      if (user.role === UserRole.Client) {
        orders = await this.orders.find({
          where: {
            customer: { id: user.id },
            // entity 에서 default = pending 을 줘서 input 으로 받지 않아도 처리
            status,
          },
        });
      } else if (user.role === UserRole.Owner) {
        orders = await this.orders.find({
          where: {
            driver: { id: user.id },
            status,
          },
        });
      } else if (user.role === UserRole.Delivery) {
        // 한명이 여러개의 restaurant 를 소유할 수 있기때문에 user.id 로 레스토랑을 검색하고
        // 연결된 orders 를 찾는다.
        // restaurant = [[order], [order]] 과 같이 중복된 배열의 형태로 돌아온다.
        const restaurants = await this.restaurants.find({
          where: { ownerId: user.id },
          relations: ['orders'],
        });
        // owner 가 보유한 레스토랑의 갯수만큼 돌며 order 가 없는 레스토랑의 경우 빈 배열까지 붙여 놓기 때문에 flat 을 이용해 1 depth 내려가서 배열을 다시 만든다.
        // orders = [[order],[order],[],[],[]] 형태를 [order, order] 형태로
        orders = restaurants.map((restaurant) => restaurant.orders).flat();
        if (status) {
          orders = orders.filter((order) => order.status === status);
        }
      }

      return {
        ok: true,
        orders,
      };
    } catch {
      return {
        ok: false,
        error: '주문목록을 가져오는데 실패했습니다.',
      };
    }
  }
}
