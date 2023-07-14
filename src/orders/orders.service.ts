import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { OrderItem } from './entities/order-item.entity';
import { Dish } from 'src/restaurant/entities/dish.entity';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { EditDishInput } from 'src/restaurant/dtos/edit-dish.dto';

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

  checkPermission(user: User, order: Order): boolean {
    // order entity 에서 @RelationId로 선언
    if (user.role === UserRole.Client && order.customerId !== user.id) {
      return false;
    }
    if (user.role === UserRole.Delivery && order.driverId !== user.id) {
      return false;
    }
    if (user.role === UserRole.Owner && order.restaurant.ownerId !== user.id) {
      return false;
    }
    return true;
  }

  async getOrder(user: User, { id }: GetOrderInput): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
        relations: ['restaurant'],
      });
      if (!order) {
        return {
          ok: false,
          error: '존재하지 않는 주문입니다.',
        };
      }

      if (!this.checkPermission(user, order)) {
        return {
          ok: false,
          error: '주문을 볼 권한이 없습니다.',
        };
      }

      return {
        ok: true,
        order,
      };
    } catch {
      return {
        ok: false,
        error: '해당 주문을 읽어오는데 실패했습니다.',
      };
    }
  }

  async editOrder(
    user: User,
    { id, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
        relations: ['restaurant'],
      });
      if (!order) {
        return {
          ok: false,
          error: '존재하지 않는 주문입니다.',
        };
      }

      if (!this.checkPermission(user, order)) {
        return {
          ok: false,
          error: '주문에 대한 수정권한이 없습니다.',
        };
      }

      let gotEditPermission = true;
      if (user.role === UserRole.Client) {
        gotEditPermission = false;
      }
      if (user.role === UserRole.Owner) {
        if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
          gotEditPermission = false;
        }
      }
      if (user.role === UserRole.Delivery) {
        if (
          status !== OrderStatus.PickedUp &&
          status !== OrderStatus.Delivered
        ) {
          gotEditPermission = false;
        }
      }
      if (!gotEditPermission) {
        return {
          ok: false,
          error: '주문을 수정할 권한이 없습니다.',
        };
      }
      //  save 는 DB 에 있는 아이템이면 변화된 부분을 바꿔서 넣어준다.
      await this.orders.save([
        {
          id,
          status,
        },
      ]);

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '해당주문 수정하는데 실패했습니다.',
      };
    }
  }
}
