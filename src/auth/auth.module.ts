import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { UsersModule } from 'src/users/users.module';

// Guard class 를 앱 안 모든 resolver에서 호출없이 자동으로 붙어지도록 nest 가 제공하는 APP_GUARD
@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
