import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { Public } from './decorator/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenGuard } from './commom/refreshtoken.guard';
import { Request } from 'express';
import { AuthError } from './errors/auth.error';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Public()
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService
      .signUp(signUpDto)
      .then(
        () =>
          'Sign up completed. An email was sent to you to confirm your email address',
      )
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new BadRequestException(error.message);
        } else {
          throw error;
        }
      });
  }

  @Patch('confirm-email/:token')
  @Public()
  confirmEmail(@Param('token') token: string) {
    return this.authService
      .confirmEmail(token)
      .then(() => 'Email confirmed')
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new NotFoundException(error.message);
        } else {
          throw error;
        }
      });
  }

  @Post('resend-confirmation-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  resendConfirmationEmail(@Body() loginDto: LoginDto) {
    return this.authService
      .resendConfirmationEmail(loginDto.email, loginDto.password)
      .then(() => 'Email sent')
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new NotFoundException(error.message);
        } else {
          throw error;
        }
      });
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService
      .login(loginDto.email, loginDto.password)
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new UnauthorizedException(error.message);
        } else {
          throw error;
        }
      });
  }

  @Get('refresh')
  @Public()
  @UseGuards(RefreshTokenGuard)
  refreshToken(@Req() req: Request) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    return this.authService
      .refreshTokens(userId, refreshToken)
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new UnauthorizedException(error.message);
        } else {
          throw error;
        }
      });
  }

  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid user');
    }
    const userId = req.user['sub'];
    return this.authService
      .logout(userId)
      .then(() => 'Logout success')
      .catch((error) => {
        if (error instanceof AuthError) {
          throw new BadRequestException(error.message);
        } else {
          throw error;
        }
      });
  }
}
