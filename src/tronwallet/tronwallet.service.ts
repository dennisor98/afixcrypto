// tron-wallet.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TronWeb } from 'tronweb';
import { WalletDto } from './dto/tron-wallet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { TronwalletDeposits } from './entities/tronwallet.entity';
import { WithdrawWalletDto } from './dto/withdrawalreq.dto';
import {
  WithdrawalRequests,
  state,
} from './entities/withdrawal.request.entity';
import { HttpService } from '@nestjs/axios';
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { ApproveWithdrawalBetDto } from './dto/approve-withdrawal';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Bet } from 'src/bets/entities/bet.entity';
import { decrypt } from 'src/common/crypto.util';
import {SettingsService} from "../common/settings.service";
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

type TronTrc20Transaction = {
  from?: string;
  to?: string;
  [key: string]: any;
};

@Injectable()
export class TronWalletService {
  private tronWeb: any;
  private usdtContractAddress: string;
  private addressToMonitor: string;
  private readonly tronGridApiBase: string;
  private readonly tronFeeLimit: number;
  private readonly tronEventName: string;
  private readonly minWithdrawAmount: number;
  private readonly withdrawTransactionFee: number;
  private readonly withdrawServiceFee: number;
  private readonly binanceWithdrawNetwork: string;
  private readonly binanceWithdrawCoin: string;
  private readonly binanceRecvWindow: number;
  private readonly binanceWithdrawUrl: string;
  private readonly binanceHistoryUrl: string;

  constructor(
    @InjectRepository(TronwalletDeposits)
    private readonly tronwalletDepositsRepository: Repository<TronwalletDeposits>,
    @InjectRepository(WithdrawalRequests)
    private readonly wthdrawalRequestRepo: Repository<WithdrawalRequests>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    private httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly dataSource: DataSource,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    this.tronGridApiBase =
      this.configService.get<string>('TRON_GRID_API_BASE') ?? '';
    this.tronWeb = new (TronWeb as any)({
      fullHost: this.configService.get<string>('TRON_FULL_NODE_URL') ?? '',
      solidityNode:
        this.configService.get<string>('TRON_SOLIDITY_NODE_URL') ?? '',
      eventServer:
        this.configService.get<string>('TRON_EVENT_SERVER_URL') ?? '',
    });
    this.usdtContractAddress =
      this.configService.get<string>('TRON_USDT_CONTRACT') ?? '';
    this.addressToMonitor =
      this.configService.get<string>('TRON_MONITORED_ADDRESS') ?? '';
    this.tronFeeLimit = this.configService.get<number>('TRON_FEE_LIMIT') ?? 0;
    this.tronEventName =
      this.configService.get<string>('TRON_EVENT_NAME') ?? '';
    this.minWithdrawAmount =
      this.configService.get<number>('WITHDRAWAL_MIN_AMOUNT') ?? 10;
    this.withdrawTransactionFee =
      this.configService.get<number>('WITHDRAWAL_TRANSACTION_FEE') ?? 1;
    this.withdrawServiceFee =
      this.configService.get<number>('WITHDRAWAL_SERVICE_FEE') ?? 1;
    this.binanceWithdrawNetwork =
      this.configService.get<string>('BINANCE_WITHDRAW_NETWORK') ?? '';
    this.binanceWithdrawCoin =
      this.configService.get<string>('BINANCE_WITHDRAW_COIN') ?? '';
    this.binanceRecvWindow =
      this.configService.get<number>('BINANCE_RECV_WINDOW') ?? 5000;
    this.binanceWithdrawUrl =
      this.configService.get<string>('BINANCE_WITHDRAW_API_URL') ?? '';
    this.binanceHistoryUrl =
      this.configService.get<string>('BINANCE_HISTORY_API_URL') ?? '';
  }

  async transferUsdt(
    fromAddress: string,
    toAddress: string,
    amount: number,
    privateKey: string,
  ): Promise<void> {
    try {
      const from =
        fromAddress ||
        this.configService.get<string>('TRON_TRANSFER_FROM_ADDRESS');
      const to =
        toAddress || this.configService.get<string>('TRON_TRANSFER_TO_ADDRESS');
      const signingKey =
        decrypt(privateKey) ||
        this.configService.get<string>('TRON_TRANSFER_PRIVATE_KEY');

      if (!from || !to || !signingKey) {
        throw new Error('Transfer credentials are not configured');
      }

      const usdtContractAddress = this.usdtContractAddress;
      this.tronWeb.setAddress(this.usdtContractAddress);
      const usdtContractInstance = await this.tronWeb
        .contract()
        .at(usdtContractAddress);

      const trxBalance = await this.tronWeb.trx.getBalance(from);
      const usdtBalance = await usdtContractInstance.balanceOf(from).call();
      const usdt = parseInt(usdtBalance) / 1000000;
      const trx = parseInt(trxBalance) / 1000000;

      if (usdt < amount) {
        throw new Error('Insufficient USDT balance.');
      }

      const options = {
        feeLimit: this.tronFeeLimit,
        callValue: 0,
        shouldPollResponse: true,
      };

      const result = await usdtContractInstance
        .transfer(to, amount * 10 ** 6)
        .send({
          from: from,
          privateKey: signingKey,
          ...options,
        });

      console.log('USDT Transfer Result:', result);
    } catch (error) {
      console.error('Failed to transfer USDT:', error);
      throw new Error('Failed to transfer USDT: ' + error);
    }
  }

  async createTronAccount(): Promise<WalletDto> {
    const account: WalletDto = await this.tronWeb.createAccount();
    console.log(account.address?.base58 ?? account.address ?? account);
    return account;
  }

  async getAccountBalance(address: string): Promise<number> {
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      return balance;
    } catch (error) {
      throw new Error(`Unable to get account balance: ${error.message}`);
    }
  }

  async getDepositTransactionHistory(address: string): Promise<any[]> {
    const options = {
      method: 'GET',
      headers: { accept: 'application/json' },
    };

    const apiUrl = `${this.tronGridApiBase}/v1/accounts/${address}`;

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Error fetching account info: ' + error.message);
    }
  }

  async getUsdtBalance(address: string): Promise<number> {
    console.log('Contract Address:', this.usdtContractAddress);
    console.log(address);
    this.tronWeb.setAddress(this.usdtContractAddress);

    const contractInstance = await this.tronWeb
      .contract()
      .at(this.usdtContractAddress);
    const balance = await contractInstance.balanceOf(address).call();
    console.log('Balance:', balance);

    return balance / 10 ** 6;
  }

  async getAccount(address: string): Promise<any> {
    return this.tronWeb.trx.getAccountResources(address);
  }

  async checkTransactions(wallet: string): Promise<any> {
    const contract = this.usdtContractAddress;
    const tronApiKey = this.configService.get<string>('TRON_PRO_API_KEY');

    if (!tronApiKey) {
      throw new Error('TRON_PRO_API_KEY is not configured');
    }

    try {
      const url = `${this.tronGridApiBase}/v1/accounts/${wallet}/transactions/trc20?contract_address=${contract}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'TRON-PRO-API-KEY': tronApiKey },
        }),
      );

      const transactions: TronTrc20Transaction[] = Array.isArray(
        response.data?.data,
      )
        ? response.data.data
        : [];
      const receivedTransactions = transactions.filter(
        (transaction) => transaction.to === wallet,
      );

      return receivedTransactions.length > 0 ? receivedTransactions[0] : null;
    } catch (error) {
      return { error: error.message };
    }
  }

  // Returns every incoming TRC20 transfer for an address, newest first.
  // checkTransactions only returns one, which loses concurrent deposits.
  async getIncomingTransactions(wallet: string): Promise<TronTrc20Transaction[]> {
    const contract = this.usdtContractAddress;
    const tronApiKey = this.configService.get<string>('TRON_PRO_API_KEY');

    if (!tronApiKey) {
      throw new Error('TRON_PRO_API_KEY is not configured');
    }

    try {
      const url = `${this.tronGridApiBase}/v1/accounts/${wallet}/transactions/trc20?contract_address=${contract}&limit=50`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'TRON-PRO-API-KEY': tronApiKey },
        }),
      );

      const transactions: TronTrc20Transaction[] = Array.isArray(
        response.data?.data,
      )
        ? response.data.data
        : [];

      return transactions.filter((transaction) => transaction.to === wallet);
    } catch (error) {
      console.error(`Failed to fetch transactions for ${wallet}:`, error.message);
      return [];
    }
  }

  async checkWithdrawTransactions(wallet: string): Promise<any> {
    const contract = this.usdtContractAddress;
    const tronApiKey = this.configService.get<string>('TRON_PRO_API_KEY');

    if (!tronApiKey) {
      throw new Error('TRON_PRO_API_KEY is not configured');
    }

    try {
      const url = `${this.tronGridApiBase}/v1/accounts/${wallet}/transactions/trc20?contract_address=${contract}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'TRON-PRO-API-KEY': tronApiKey },
        }),
      );

      const transactions: TronTrc20Transaction[] = Array.isArray(
        response.data?.data,
      )
        ? response.data.data
        : [];
      const sentArray = transactions.filter(
        (transaction) => transaction.from === wallet,
      );
      console.log(sentArray);

      return sentArray.length > 0 ? sentArray : null;
    } catch (error) {
      return { error: error.message };
    }
  }

  async getUserByAddress(address: string): Promise<User | null> {
    const queryBuilder = this.userRepo.createQueryBuilder('u');
    queryBuilder.where('u.address = :address', { address });
    return queryBuilder.getOne();
  }

  async getTronwalletDepositByTransactionId(
    transactionId: string,
  ): Promise<TronwalletDeposits | null> {
    const queryBuilder =
      this.tronwalletDepositsRepository.createQueryBuilder('td');
    queryBuilder.where('td.transaction_id = :transactionId', { transactionId });
    return queryBuilder.getOne();
  }

  async subscribeToTransferEvents() {
    if (!this.tronWeb) throw new Error('TronWeb not properly initialized');

    this.tronWeb.eventServer.subscribe(
      {
        name: this.tronEventName,
        address: this.addressToMonitor,
      },
      (error: Error | null, eventResult: any) => {
        if (error) {
          console.error('Error in event subscription:', error);
        } else {
          this.processTransferEvent(eventResult);
        }
      },
    );
  }

  private processTransferEvent(eventResult: any) {
    console.log('Received Transfer Event:', eventResult);
  }

  async findByUserIdAndStatusPending(
    userId: string,
  ): Promise<WithdrawalRequests | null> {
    return this.wthdrawalRequestRepo.findOne({
      where: {
        user: { id: userId },
        status: state.pending,
      },
    });
  }

  async getmywithdrawalRequest(userinput: any) {
    const user = await this.userRepo.findOne({ where: { id: userinput.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    return this.wthdrawalRequestRepo.find({
      where: { user: { id: userinput.sub } },
    });
  }

  async getmyDeposits(userinput: any) {
    const user = await this.userRepo.findOne({ where: { id: userinput.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    return this.tronwalletDepositsRepository.find({
      where: { user: { id: userinput.sub } },
    });
  }

  async requestWithdraw(withdrawWalletDto: WithdrawWalletDto, authUserId: string) {
    await this.settingsService.assertWithdrawalsEnabled();

    // Identity comes from the verified token, never the request body
    const user = await this.userRepo.findOne({ where: { id: authUserId } });
    if (!user) throw new UnauthorizedException('User not found');

    const existingWithdrawal = await this.findByUserIdAndStatusPending(user.id);
    if (existingWithdrawal) {
      throw new UnauthorizedException(
        'You already have a pending withdrawal, please contact admin',
      );
    }

    if (user.isblocked) {
      throw new UnauthorizedException('Account is blocked please contact admin');
    }
    if (!user.hasMadeFirstDeposit) {
      throw new UnauthorizedException('Please make a first deposit to withdraw');
    }

    const wallet = await this.walletRepo
      .createQueryBuilder('w')
      .where('w.userId = :userId', { userId: user.id })
      .getOne();

    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    const walletBalance = Number(wallet.amount);
    if (!Number.isFinite(walletBalance)) {
      throw new HttpException(
        'Wallet balance is invalid',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const requestedAmount = Number(withdrawWalletDto.amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new HttpException(
        'Invalid withdrawal amount supplied',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Basic shape check on the destination address
    const address = (withdrawWalletDto.address || '').trim();
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
      throw new HttpException(
        'Invalid TRC20 address supplied',
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalFees = this.withdrawTransactionFee + this.withdrawServiceFee;
    const totalDebit = requestedAmount + totalFees;

    if (requestedAmount < this.minWithdrawAmount) {
      throw new HttpException(
        `Minimum withdrawal should be ${this.minWithdrawAmount} USDT exclusive of the ${totalFees} USDT fees`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (totalDebit > walletBalance) {
      throw new HttpException(
        'Insufficient funds, amount must be above the minimum withdrawable plus the service charges',
        HttpStatus.FORBIDDEN,
      );
    }

    const withrequest = new WithdrawalRequests();
    withrequest.amount = requestedAmount.toString();
    withrequest.address = address;
    withrequest.user = user;
    withrequest.status = state.pending;

    await this.wthdrawalRequestRepo.save(withrequest);
    return 'Your request is being processed';
  }

  async approveWithdrawal(
    approvewithdrawWalletDto: ApproveWithdrawalBetDto,
    adminUserId: string,
  ) {
    const requestwith = await this.wthdrawalRequestRepo.findOne({
      where: { id: approvewithdrawWalletDto.withdrawalId },
      relations: ['user'],
    });

    if (!requestwith) {
      throw new HttpException(
        'Withdrawal request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Only a pending request may be actioned, so it cannot be paid twice
    if (requestwith.status !== state.pending) {
      throw new HttpException(
        `Withdrawal already ${requestwith.status}`,
        HttpStatus.CONFLICT,
      );
    }

    if (approvewithdrawWalletDto.status === state.rejected) {
      requestwith.status = state.rejected;
      await this.wthdrawalRequestRepo.save(requestwith);
      console.log(`[withdrawal] ${requestwith.id} rejected by admin ${adminUserId}`);

      await this.safeNotify(
        requestwith.user.id,
        'rejected',
        Number(requestwith.amount),
      );
      return 'success';
    }

    if (approvewithdrawWalletDto.status !== state.approved) {
      throw new HttpException(
        'Invalid withdrawal status supplied',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = requestwith.user.id;
    const amount = Number(requestwith.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException(
        'Invalid withdrawal amount stored',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const totalFees = this.withdrawTransactionFee + this.withdrawServiceFee;
    const totalDebit = amount + totalFees;

    // Debit and mark approved atomically, before any funds are sent.
    // The wallet row is locked so concurrent approvals cannot double spend.
    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.userId = :userId', { userId })
        .getOne();

      if (!wallet) {
        throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
      }

      const walletBalance = Number(wallet.amount);
      if (!Number.isFinite(walletBalance)) {
        throw new HttpException(
          'Wallet balance is invalid',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (totalDebit > walletBalance) {
        throw new HttpException(
          'Insufficient funds to approve withdrawal',
          HttpStatus.BAD_REQUEST,
        );
      }

      wallet.amount = (walletBalance - totalDebit).toFixed(8);
      await manager.save(wallet);

      const fresh = await manager.getRepository(WithdrawalRequests).findOne({
        where: { id: requestwith.id },
      });
      if (!fresh || fresh.status !== state.pending) {
        throw new HttpException('Withdrawal already actioned', HttpStatus.CONFLICT);
      }
      fresh.status = state.approved;
      await manager.save(fresh);
    });

    // Funds are sent only after the balance is committed.
    // A failure here leaves the request approved and debited for manual review,
    // rather than risking a double send.
    let withdrawalResponse: any;
    try {
      withdrawalResponse = await this.makeWithdrawRequest(
        amount,
        requestwith.address,
      );
    } catch (err: any) {
      console.error(
        `[withdrawal] PAYOUT FAILED after debit. request=${requestwith.id} user=${userId} amount=${amount} admin=${adminUserId} error=${err?.message}`,
      );
      throw new HttpException(
        'Balance was debited but the payout failed. This request needs manual review before retrying.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!withdrawalResponse || !withdrawalResponse.id) {
      console.error(
        `[withdrawal] NO PROVIDER ID after debit. request=${requestwith.id} user=${userId} admin=${adminUserId}`,
      );
      throw new HttpException(
        'Payout provider did not return an id. This request needs manual review.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Best effort: attach the on chain transaction id
    try {
      const withdrawal_log = await this.findWithdrawalById(withdrawalResponse.id);
      requestwith.status = state.approved;
      requestwith.txId = withdrawal_log.txid;
      await this.wthdrawalRequestRepo.save(requestwith);
    } catch (err: any) {
      console.error(
        `[withdrawal] could not attach txId for request=${requestwith.id}: ${err?.message}`,
      );
    }

    console.log(
      `[withdrawal] ${requestwith.id} approved by admin ${adminUserId}, amount ${amount}`,
    );

    await this.safeNotify(userId, 'approved', amount);
    return { response: 'Wait for confirmation' };
  }

  // Notification failure must never surface as a withdrawal failure
  private async safeNotify(userId: string, status: string, amount: number) {
    try {
      await this.notificationsGateway.emitWithdrawalUpdate(userId, status, amount);
    } catch (err: any) {
      console.error(
        `[withdrawal] notification failed for user ${userId}: ${err?.message}`,
      );
    }
  }

  async makeWithdrawRequest(amount: number, address: string) {
    try {
      const apiKey = this.configService.get<string>('BINANCE_WITHDRAW_API_KEY');
      const secret = this.configService.get<string>(
        'BINANCE_WITHDRAW_API_SECRET',
      );

      if (!apiKey || !secret) {
        throw new Error('Binance withdraw credentials missing');
      }

      const timestamp = Date.now().toString();
      const params = new URLSearchParams({
        coin: this.binanceWithdrawCoin,
        network: this.binanceWithdrawNetwork,
        address,
        amount: amount.toString(),
        timestamp,
        recvWindow: this.binanceRecvWindow.toString(),
      });

      const signature = this.signature(params.toString(), secret);
      params.append('signature', signature);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.binanceWithdrawUrl}?${params.toString()}`,
          null,
          {
            maxBodyLength: Infinity,
            headers: {
              'Content-Type': 'application/json',
              'X-MBX-APIKEY': apiKey,
            },
          },
        ),
      );

      if (response.status === 200) return response.data;

      throw new HttpException(response.data, HttpStatus.FORBIDDEN);
    } catch (error) {
      const errorMessage = error.response?.data?.msg || 'An error occurred';
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  async findWithdrawalById(id: string) {
    const data = await this.getWithdrawHistory();
    if (Array.isArray(data) && data.length !== 0) {
      const transa = data.find((item) => item.id === id);
      if (transa) return transa;
    }
    throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
  }

  async getWithdrawHistory(): Promise<any> {
    const apiKey = this.configService.get<string>('BINANCE_HISTORY_API_KEY');
    const secret = this.configService.get<string>('BINANCE_HISTORY_API_SECRET');

    if (!apiKey || !secret) {
      throw new Error('Binance history credentials missing');
    }

    const timestamp = Date.now().toString();
    const signaturePayload = `timestamp=${timestamp}&recvWindow=${this.binanceRecvWindow}`;
    const signature = this.signature(signaturePayload, secret);

    try {
      const response = await this.httpService
        .get(this.binanceHistoryUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-MBX-APIKEY': apiKey,
          },
          params: { timestamp, recvWindow: this.binanceRecvWindow, signature },
        })
        .toPromise();

      if (!response) {
        throw new HttpException(
          'No response from Binance history endpoint',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return response.data;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Something went wrong try again in a few',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  signature(query_string: string, apiSecret: string): string {
    return crypto
      .createHmac('sha256', apiSecret)
      .update(query_string)
      .digest('hex');
  }

  async getwithdrawalRequest() {
    return this.wthdrawalRequestRepo.find({
      where: { status: state.pending },
      relations: ['user'],
    });
  }

  async getAllWithdrawalsAdmin(): Promise<WithdrawalRequests[]> {
    return this.wthdrawalRequestRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getWithdrawalByIdAdmin(id: string): Promise<WithdrawalRequests> {
    const withdrawal = await this.wthdrawalRequestRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!withdrawal) {
      throw new HttpException('Withdrawal not found', HttpStatus.NOT_FOUND);
    }
    return withdrawal;
  }

  async getAllDepositsAdmin(): Promise<TronwalletDeposits[]> {
    return this.tronwalletDepositsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDepositByIdAdmin(id: string): Promise<TronwalletDeposits> {
    const deposit = await this.tronwalletDepositsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!deposit) {
      throw new HttpException('Deposit not found', HttpStatus.NOT_FOUND);
    }
    return deposit;
  }

  async getTreasuryStats() {
    const treasuryAddress = this.configService.get<string>('TREASURY_ADDRESS');

    let usdtBalance = '0';
    let trxBalance = '0';
    try {
      if (treasuryAddress) {
        const trx = await this.tronWeb.trx.getBalance(treasuryAddress);
        trxBalance = (trx / 1_000_000).toString();
        const usdt = await this.getUsdtBalance(treasuryAddress);
        usdtBalance = String(usdt);
      }
    } catch (e) {
      console.error('Treasury balance fetch failed:', e);
    }

    const allWallets = await this.walletRepo.find();
    const allBets = await this.betRepo.find();

    const totalUserBalances = allWallets.reduce(
      (sum: number, w: Wallet) => sum + parseFloat(w.amount || '0'),
      0,
    );
    const totalWagered = allBets.reduce(
      (sum: number, b: Bet) => sum + parseFloat(b.betAmount || '0'),
      0,
    );
    const totalPaidOut = allBets
      .filter((b: Bet) => b.status === 'won')
      .reduce(
        (sum: number, b: Bet) => sum + parseFloat(b.betAmount || '0') * 1.95,
        0,
      );
    const totalCollected = allBets
      .filter((b: Bet) => b.status === 'loss')
      .reduce((sum: number, b: Bet) => sum + parseFloat(b.betAmount || '0'), 0);
    const netRevenue = totalCollected - (totalPaidOut - totalWagered);

    return {
      address: treasuryAddress || null,
      usdtBalance,
      trxBalance,
      totalUserBalances: totalUserBalances.toFixed(2),
      totalWagered: totalWagered.toFixed(2),
      totalPaidOut: totalPaidOut.toFixed(2),
      netRevenue: netRevenue.toFixed(2),
    };
  }
}