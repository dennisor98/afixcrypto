import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const config = {
    APP_NAME: 'Crypto Trading API',
    APP_VERSION: '1.0.0',
    API_VERSION: 'v1',
    NODE_ENV: 'development',
  } as const;

  const mockConfigService = {
    get: jest.fn((key: keyof typeof config) => {
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });
  });

  describe('getRoot', () => {
    it('should return application information', () => {
      const result = {
        name: 'Crypto Trading API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(appService, 'getApplicationInfo').mockReturnValue(result);

      const response = appController.getRoot();

      expect(response).toEqual(result);
      expect(response).toHaveProperty('name');
      expect(response).toHaveProperty('version');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('timestamp');
      expect(appService.getApplicationInfo).toHaveBeenCalled();
    });

    it('should have status as running', () => {
      const result = appController.getRoot();
      expect(result.status).toBe('running');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = {
        status: 'ok',
        uptime: 100,
        timestamp: new Date().toISOString(),
        environment: 'test',
      };

      jest.spyOn(appService, 'getHealthStatus').mockReturnValue(result);

      const response = appController.getHealth();

      expect(response).toEqual(result);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uptime');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('environment');
      expect(appService.getHealthStatus).toHaveBeenCalled();
    });

    it('should return status as ok', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
    });

    it('should return test environment', () => {
      const result = appController.getHealth();
      expect(result.environment).toBe('test');
    });

    it('should return uptime as a number', () => {
      const result = appController.getHealth();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = {
        version: '1.0.0',
        apiVersion: 'v1',
      };

      jest.spyOn(appService, 'getVersion').mockReturnValue(result);

      const response = appController.getVersion();

      expect(response).toEqual(result);
      expect(response).toHaveProperty('version');
      expect(response).toHaveProperty('apiVersion');
      expect(appService.getVersion).toHaveBeenCalled();
    });

    it('should return correct version format', () => {
      const result = appController.getVersion();
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/); // Matches semver format
    });

    it('should return API version', () => {
      const result = appController.getVersion();
      expect(result.apiVersion).toBe('v1');
    });
  });

  describe('Service Integration', () => {
    it('should properly inject AppService', () => {
      expect(appService).toBeDefined();
      expect(appService).toBeInstanceOf(AppService);
    });

    it('should call service methods when controller methods are invoked', () => {
      const getApplicationInfoSpy = jest.spyOn(appService, 'getApplicationInfo');
      const getHealthStatusSpy = jest.spyOn(appService, 'getHealthStatus');
      const getVersionSpy = jest.spyOn(appService, 'getVersion');

      appController.getRoot();
      appController.getHealth();
      appController.getVersion();

      expect(getApplicationInfoSpy).toHaveBeenCalledTimes(1);
      expect(getHealthStatusSpy).toHaveBeenCalledTimes(1);
      expect(getVersionSpy).toHaveBeenCalledTimes(1);
    });
  });
});