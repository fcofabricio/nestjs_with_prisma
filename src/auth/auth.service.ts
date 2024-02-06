import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { AuthError } from './errors/auth.error';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { UserServiceError } from 'src/users/errors/users.service.error';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  signUp(signUpDto: SignUpDto) {
    const { email, fullName, password } = signUpDto;

    return this.usersService
      .create({
        email,
        fullName,
        password: bcrypt.hashSync(password, bcrypt.genSaltSync()),
      })
      .then((user) => {
        this.sendEmail(user);
        return user;
      })
      .catch((error) => {
        if (error instanceof UserServiceError) {
          throw new AuthError(error.message);
        } else {
          throw error;
        }
      });
  }

  private sendEmail(user: Prisma.UserUncheckedCreateInput) {
    const mail = {
      to: user.email,
      from: 'noreply@application.com',
      subject: 'Email de confirmação',
      template: 'email-confirmation',
      context: {
        token: user.emailHash,
      },
    };

    // TODO: if mail fails, what should we do?
    return this.mailerService.sendMail(mail);
  }

  confirmEmail(hash: string) {
    return this.usersService.findOneByEmailHash(hash).then((user) => {
      if (user) {
        return this.usersService.update(user.id, { emailVerified: true });
      } else {
        throw new AuthError('User no found to confirm email');
      }
    });
  }

  resendConfirmationEmail(email: string, password: string) {
    return this.usersService.findOneByEmail(email).then(async (user) => {
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new AuthError('Invalid email or password');
      }

      if (user.emailVerified) {
        throw new AuthError('Already verified email');
      }

      return this.sendEmail(user);
    });
  }

  login(email: string, password: string) {
    return this.usersService.findOneByEmail(email).then(async (user) => {
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new AuthError('Invalid email or password');
      }

      if (!user.emailVerified) {
        throw new AuthError('Not verified email');
      }

      const tokens = await this.getTokens(user.id, user.email);
      return this.updateRefreshToken(user.id, tokens.refreshToken).then(() => {
        return tokens;
      });
    });
  }

  refreshTokens(userId: number, refreshToken: string) {
    return this.usersService.findOneById(userId).then(async (user) => {
      if (
        !user ||
        !user.refreshToken ||
        !bcrypt.compareSync(refreshToken, user.refreshToken)
      ) {
        throw new AuthError('Invalid refresh token');
      }

      const tokens = await this.getTokens(user.id, user.email);

      return this.updateRefreshToken(user.id, tokens.refreshToken).then(() => {
        return tokens;
      });
    });
  }

  logout(userId: number) {
    return this.usersService
      .update(userId, {
        refreshToken: null,
      })
      .catch((error) => {
        if (error instanceof UserServiceError) {
          throw new AuthError(error.message);
        } else {
          throw error;
        }
      });
  }

  private updateRefreshToken(userId: number, refreshToken: string) {
    return this.usersService.update(userId, {
      refreshToken: bcrypt.hashSync(refreshToken, bcrypt.genSaltSync()),
    });
  }

  private getTokens(userId: number, username: string) {
    return Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_ACCESS_EXPIRATION_TIME',
          ),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_REFRESH_EXPIRATION_TIME',
          ),
        },
      ),
    ]).then(([accessToken, refreshToken]) => {
      return {
        accessToken,
        refreshToken,
      };
    });
  }
}
