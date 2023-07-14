import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { JwtModule } from './jwt/jwt.module';
import { Verification } from './users/entities/verification.entity';
import { MailModule } from './mail/mail.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { Restaurant } from './restaurant/entities/restaurant.entity';
import { Category } from './restaurant/entities/category.entity';
import { AuthModule } from './auth/auth.module';
import { Dish } from './restaurant/entities/dish.entity';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';

@Module({
  imports: [
    // config 를 쓰기 위해 @nestjs/config 을 인스톨
    ConfigModule.forRoot({
      isGlobal: true,
      // cross-env 를 인스톨해서 실행시 지시한 dev, prod 를 NODE_ENV 로 받아온다.
      envFilePath: process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env.test',
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      // joi 를 인스톨해서 validation
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'prod', 'test').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        PRIVATE_KEY: Joi.string().required(),
        MAILGUN_API_KEY: Joi.string().required(),
        MAILGUN_DOMAIN_NAME: Joi.string().required(),
        MAILGUN_FROM_EMAIL: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // data 를 자동으로 만들것인지에 대한 옵션
      // 실제 deploy 될때는 기존 DB 를 사용할수 있으므로 자동만들기 금지
      synchronize: process.env.NODE_ENV !== 'prod',
      logging: process.env.NODE_ENV !== 'prod',
      entities: [
        User,
        Verification,
        Restaurant,
        Category,
        Dish,
        Order,
        OrderItem,
      ],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // web-socket 기능을 활성화시킨다.
      // installSubscriptionHandlers: true, 도 ws연결은 되지만,
      //  context 를 가져오는데 문제가 생긴다.
      subscriptions: {
        'subscriptions-transport-ws': {
          onConnect: (connectionParams: any) => {
            // onConnect 함수가 context['token']으로 return 하는 듯
            // frontend apollo.ts 에서 입력할때 x-jwt 소문자로 할것
            return { token: connectionParams['x-jwt'] };
          },
        },
      },
      // schema.gql 파일을 만들지 않으려면
      autoSchemaFile: true,
      // resolver 가 호출될때 마다 context 안의 함수가 실행.
      // 즉, http req를 가져와서 'x-jwt'를 찾아 token 이라는 이름으로 context 안에 쑤셔넣는다.
      context: ({ req }) => {
        return { token: req.headers['x-jwt'] };
      },
    }),
    JwtModule.forRoot({
      privateKey: process.env.PRIVATE_KEY,
    }),
    MailModule.forRoot({
      apiKey: process.env.MAILGUN_API_KEY,
      emailDomain: process.env.MAILGUN_DOMAIN_NAME,
      fromEmail: process.env.MAILGUN_FROM_EMAIL,
    }),
    UsersModule,
    RestaurantModule,
    AuthModule,
    OrdersModule,
  ],
  controllers: [],
  providers: [],
})
// http req를 이용위한 middleware를 사용하기 위한 선언 했으나 subscriptions 인증을 위해 다른 방법 사용
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(JwtMiddleware).forRoutes({
//       path: '*',
//       method: RequestMethod.ALL,
//     });
//   }
// }
export class AppModule {}
