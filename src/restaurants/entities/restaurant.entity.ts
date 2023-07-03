import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// ObjectType 으로 선언하면 자료를 외부에서 받을때 한꺼번에 처리할수 있어서 편하지만,
// service 에서 사용하는 함수들이 inputType 을 사용하는 경우가 많아서
// baseClass 를 @InputType({ isAbstract: true }) 해 child 와 type 을 맞춰준다.
@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class Restaurant {
  @Field(() => Number)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column()
  address: string;

  @Field(() => String)
  @Column()
  owner: string;

  @Field(() => String)
  @Column()
  categoryName: string;
}
