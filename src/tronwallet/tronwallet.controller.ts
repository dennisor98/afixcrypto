import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TronWalletService } from './tronwallet.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WithdrawWalletDto } from './dto/withdrawalreq.dto';
import { ApproveWithdrawalBetDto } from './dto/approve-withdrawal';
import { AdminGuard, AuthGuard } from 'src/auth/auth.guard';

@Controller('wallet')
@ApiTags('Wallet')
@ApiBearerAuth('defaultBearerAuth')
export class TronwalletController {
  constructor(private readonly tronwalletService: TronWalletService) {}

  @Post('withdraw')
  @UseGuards(AuthGuard)
  reqwithdrawal(@Body() withdrawWalletDto: WithdrawWalletDto, @Request() req: any) {
    return this.tronwalletService.requestWithdraw(withdrawWalletDto, req.user.id);
  }

  // Admin only: this endpoint moves real funds
  @Post('approve/withdraw')
  @UseGuards(AdminGuard)
  withdrawal(@Body() approvewithdrawWalletDto: ApproveWithdrawalBetDto, @Request() req: any) {
    return this.tronwalletService.approveWithdrawal(approvewithdrawWalletDto, req.user.id);
  }

  // Admin only: returns every user's pending withdrawals
  @Get('withdrawalRequests')
  @UseGuards(AdminGuard)
  findWithdrawalrequest() {
    return this.tronwalletService.getwithdrawalRequest();
  }

  @Get('deposits')
  @UseGuards(AuthGuard)
  findDeposits(@Request() req: any) {
    return this.tronwalletService.getmyDeposits(req.user);
  }

  @Get('mywithdrawalRequests')
  @UseGuards(AuthGuard)
  findMyWithdrawalrequest(@Request() req: any) {
    return this.tronwalletService.getmywithdrawalRequest(req.user);
  }

  @Get('subscribe')
  @UseGuards(AdminGuard)
  subscribeToEvents() {
    this.tronwalletService.subscribeToTransferEvents();
    return 'Subscribed to Transfer events.';
  }

  @Get('transactions/:address')
  @UseGuards(AdminGuard)
  async getTronTransactions(@Param('address') address: string) {
    return this.tronwalletService.checkWithdrawTransactions(address);
  }

  @Get('account/:address')
  @UseGuards(AdminGuard)
  async getTronAccount(@Param('address') address: string) {
    return this.tronwalletService.getAccount(address);
  }

  @Get('usdtBalance/:address')
  @UseGuards(AdminGuard)
  async getUsdtBalance(@Param('address') address: string): Promise<number> {
    const balance = await this.tronwalletService.getUsdtBalance(address);
    if (balance === null) {
      throw new NotFoundException('USDT balance not found');
    }
    return balance;
  }

  @Get('balance/:address')
  @UseGuards(AdminGuard)
  async getBalance(@Param('address') address: string): Promise<number> {
    const balance = await this.tronwalletService.getAccountBalance(address);
    if (balance === undefined) {
      throw new NotFoundException('Account not found');
    }
    return balance;
  }

  @Get('deposits/:address')
  @UseGuards(AdminGuard)
  async getDepositTransactionHistory(@Param('address') address: string): Promise<any[]> {
    const transactions = await this.tronwalletService.getDepositTransactionHistory(address);
    if (!transactions) {
      throw new NotFoundException('Deposit transaction history not found');
    }
    return transactions;
  }

  @Get('admin/withdrawals')
  @UseGuards(AdminGuard)
  getAllWithdrawalsAdmin() {
    return this.tronwalletService.getAllWithdrawalsAdmin();
  }

  @Get('admin/withdrawals/:id')
  @UseGuards(AdminGuard)
  getWithdrawalByIdAdmin(@Param('id') id: string) {
    return this.tronwalletService.getWithdrawalByIdAdmin(id);
  }

  @Get('admin/deposits')
  @UseGuards(AdminGuard)
  getAllDepositsAdmin() {
    return this.tronwalletService.getAllDepositsAdmin();
  }

  @Get('admin/deposits/:id')
  @UseGuards(AdminGuard)
  getDepositByIdAdmin(@Param('id') id: string) {
    return this.tronwalletService.getDepositByIdAdmin(id);
  }

  @Get('admin/treasury')
  @UseGuards(AdminGuard)
  getTreasuryStats() {
    return this.tronwalletService.getTreasuryStats();
  }
}