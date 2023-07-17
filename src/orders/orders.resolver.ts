import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { OrderService } from './orders.service';
import { Order } from './entities/order.entity';
import { Role } from 'src/auth/role.decorator';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { Inject } from '@nestjs/common';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/commom.constants';
import { PubSub } from 'graphql-subscriptions';
import { OrderUpdatesInput } from './dtos/order-updates.dto';

@Resolver((of) => Order)
export class OrderResolver {
  constructor(
    private readonly orderService: OrderService,
    @Inject(PUB_SUB) private readonly pubsub: PubSub,
  ) {}

  @Mutation(() => CreateOrderOutput)
  @Role(['Client'])
  createOrder(
    @AuthUser() customer: User,
    @Args('input') createOrderInput: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    return this.orderService.createOrder(customer, createOrderInput);
  }

  @Query(() => GetOrdersOutput)
  @Role(['Any'])
  getOrders(
    @AuthUser() user: User,
    @Args('input') getOrdersInput: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    return this.orderService.getOrders(user, getOrdersInput);
  }

  @Query(() => GetOrderOutput)
  @Role(['Any'])
  getOrder(
    @AuthUser() user: User,
    @Args('input') getOrderInput: GetOrderInput,
  ): Promise<GetOrderOutput> {
    return this.orderService.getOrder(user, getOrderInput);
  }

  @Mutation(() => EditOrderOutput)
  @Role(['Any'])
  editOrder(
    @AuthUser() user: User,
    @Args('input') editOrderInput: EditOrderInput,
  ): Promise<EditOrderOutput> {
    return this.orderService.editOrder(user, editOrderInput);
  }

  // @Subscription(() => Order, {
  // subscription 이 제공하는 필터를 이용해 subscripton의 variables 와
  // 이것에 변화를 주는 mutation 의 payload 를 비교해 같은 경우만 subscribe 한다
  // 이 기능이 없다면 subscribe 의 의미가 없어진다.
  // filter: ({ readyPotato }:payload, { id }:variables) => {
  //   return readyPotato === id;
  // },
  // 사용자가 받을 알림의 내용을 바꿔준다.
  // resolve: ({ readyPotato }) => `Youtr Potato ${readyPotato} id ready`,
  // })
  @Subscription(() => Order, {
    filter: ({ pendingOrders: { ownerId } }, _, { user }) => {
      return ownerId === user.id;
    },
    // Subscription(() => Order)이고 pendingorders: order 인 경우, resolve 를 만들필요 없다.
    // Subscription(() => Order) 인데, payload 를 변형시켰기때문에 사용자가 받을 내용을 수정해 준다.
    resolve: ({ pendingOrders: { order } }) => order,
  })
  @Role(['Owner'])
  pendingOrders() {
    return this.pubsub.asyncIterator(NEW_PENDING_ORDER);
  }

  @Subscription(() => Order)
  @Role(['Delivery'])
  cookedOrders() {
    return this.pubsub.asyncIterator(NEW_COOKED_ORDER);
  }

  @Subscription(() => Order, {
    filter: (
      // type 을 명시
      { orderUpdates: order }: { orderUpdates: Order },
      { input }: { input: OrderUpdatesInput },
      { user }: { user: User },
    ) => {
      if (
        order.driverId !== user.id &&
        order.customerId !== user.id &&
        order.restaurant.ownerId !== user.id
      )
        return false;
      return order.id === input.id;
    },
  })
  @Role(['Any'])
  async orderUpdates(@Args('input') orderUpdatesInput: OrderUpdatesInput) {
    return this.pubsub.asyncIterator(NEW_ORDER_UPDATE);
  }
}
