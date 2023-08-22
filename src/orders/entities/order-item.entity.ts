import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Dish } from 'src/restaurant/entities/dish.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

// dish 의 options 가 json 형식이라서 이 형식을 받아서 restaurant 에 전해주는 entity 가 필요
@InputType('OrderItemOptionInputType', { isAbstract: true })
@ObjectType()
export class OrderItemOption {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  choice?: string;
}

@InputType('OrderItemInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class OrderItem extends CoreEntity {
  @Field(() => Dish)
  // dish=> dish.id 형식처럼 Dish table 의 연결점을 지정해 주지 않아도 됨
  // 이유는 Dish 에서 OrderItem 을 불러올 일이 없기 때문
  @ManyToOne(() => Dish, { nullable: true, onDelete: 'CASCADE' })
  dish: Dish;

  @Field(() => [OrderItemOption], { nullable: true })
  @Column({ type: 'json', nullable: true })
  options?: OrderItemOption[];
}
