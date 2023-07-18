import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from 'src/restaurant/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, RelationId } from 'typeorm';

@InputType('PaymentInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Payment extends CoreEntity {
  @Field(() => String)
  @Column()
  transactionId: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.payments, {
    nullable: true,
  })
  user: User;

  @RelationId((payment: Payment) => payment.user)
  userId: number;

  // restaurant쪽에서 payment 를 불러올 일이 없으면, restaurant entity 에도 payment 필드를 넣지말고
  // payment 쪽에서도 @ManyToOne(() => Restaurant, restaurant=> restaurant.payment)라고 선언하지 않는다.
  @Field(() => Restaurant)
  @ManyToOne(() => Restaurant)
  restaurant: Restaurant;

  @Field(() => Int)
  @RelationId((payment: Payment) => payment.restaurant)
  restaurantId: number;
}
