import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // DEBUG: verify JWT_SECRET is loaded
    console.log(
        'JWT_SECRET loaded:',
        configService.get<string>('JWT_SECRET')?.substring(0, 10) ?? 'UNDEFINED',
    );

    app.use(cookieParser());

    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL ?? 'http://localhost:3000',
    ].filter(Boolean);

    app.enableCors({
        origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
        ) => {
            // Allow Vercel preview deployments (random subdomains)
            const isVercelPreview = origin?.endsWith('.vercel.app');

            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        },
        credentials: true,
        exposedHeaders: ['X-Access-Token'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            stopAtFirstError: false,
        }),
    );

    // Swagger setup (must happen BEFORE listen)
    const swaggerToken = configService.get<string>('SWAGGER_DEFAULT_BEARER');
    const appName = configService.get<string>('APP_NAME') ?? 'API';
    const appDescription = configService.get<string>('APP_DESCRIPTION') ?? '';
    const apiVersion = configService.get<string>('API_VERSION') ?? '1.0.0';
    const swaggerTag = configService.get<string>('SWAGGER_TAG') ?? 'api';
    const swaggerPath = configService.get<string>('SWAGGER_PATH') ?? 'api/docs';
    const port = configService.get<number>('APP_PORT') ?? 3001;

    const config = new DocumentBuilder()
        .setTitle(appName)
        .setDescription(appDescription)
        .setVersion(apiVersion)
        .addTag(swaggerTag)
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup(swaggerPath, app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            defaultModelsExpandDepth: -1,
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
            syntaxHighlight: { activate: true, theme: 'monokai' },
            tryItOutEnabled: true,
            ...(swaggerToken && {
                authAction: {
                    'JWT-auth': {
                        name: 'JWT-auth',
                        schema: {
                            type: 'http',
                            in: 'header',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                        value: swaggerToken,
                    },
                },
            }),
        },
        customSiteTitle: `${appName} API Documentation`,
        customCss: '.swagger-ui .topbar { display: none }',
    });

    // Single listen call, AFTER all setup
    await app.listen(port);

    const networkInterfaces = os.networkInterfaces();
    console.log('Server is running on:');
    Object.entries(networkInterfaces).forEach(
        ([interfaceName, interfaceInfo]) => {
            interfaceInfo?.forEach((networkInfo) => {
                if (networkInfo.family === 'IPv4' && networkInfo.address) {
                    console.log(`${interfaceName}: http://${networkInfo.address}:${port}`);
                }
            });
        },
    );

    console.log(`\n Swagger documentation: http://localhost:${port}/${swaggerPath}`);
}

bootstrap();