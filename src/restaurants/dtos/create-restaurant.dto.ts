import { InputType, OmitType } from '@nestjs/graphql';
import { Restaurant } from '../entities/restaurant.entity';

@InputType()
// 기본 entity 와 graphQl 필요로 하는 dto를 각자 작성할 경우, 특정필드를 빼는 실수가 있을수 있다.
// 이것을 막기 위해 기본 entity를 baseClass 로 잡고 extends 를 사용해
// baseClass 와 연동하게 만든다.
export class CreateRestaurantInput extends OmitType(
  Restaurant,
  ['id'],
  // parent Restaurant 와 다른 type으로 자료를 받으려면 type 을 변환해 맞춰줘야 한다.
  // InputType,
) {}
