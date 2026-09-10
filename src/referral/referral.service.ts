/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Double, Repository } from 'typeorm';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralBonus } from './entities/bonus.entity';
import { Referrer } from './entities/referral.entity';
import { randomUUID } from 'crypto'; // use Node's built-in UUID generator instead of the 'uuid' package
import { Wallet } from 'src/user/entities/user.wallet.entity';
import { User } from 'src/user/entities/user.entity';


@Injectable()
export class ReferralsService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Referrer)
    private readonly referrerRepository: Repository<Referrer>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(ReferralBonus)
    private readonly referralBonusRepository: Repository<ReferralBonus>
  ) { }

  generateShortReferralCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters.charAt(randomIndex);
    }
    return code;
  }



  async createReferralForNewUser(user: User, referralCode: string) {
    let referrer;


    if (referralCode) {



      referrer = await this.userRepository.findOne({ where: { referralCode: referralCode } });




      console.log(referrer)
      console.log(user)

      // If the referrer exists, associate it with the user
      if (referrer) {
        const refa = new Referrer();
        refa.referredUser = user
        refa.referrer = referrer

        await this.referrerRepository.save(refa);
        return;





      }
      return;
    } return;
  }


  async findRefferals(use: any) {
    const user = await this.userRepository.findOne({
      where: { id: use.id }, relations: ['referralBonus', 'referrer.user', 'referrer.referrer.user', 'referrer.referrer.referrer.user', 'referrer.referrer.referrer.referrer.user'],

    });
    return user;
  }

  async findByReferredBonusUserId(referredUserId: string): Promise<ReferralBonus | null> {
    return this.referralBonusRepository
      .createQueryBuilder('referralBonus')
      .where('referralBonus.referredUserId = :referredUserId', { referredUserId })
      .getOne();
  }



  async handleTrades(use: User, tradeAmount: number) {
    console.log(use)



    const referrer = await this.referrerRepository.findOne({ where: { referredUser: use } ,relations:['referrer','referredUser']})

    if (!referrer) {
      return;
    }



    const referrer1 = await this.referrerRepository.findOne({ where: { referredUser: referrer.referrer } ,relations:['referrer','referredUser']})



    const referrer2 = referrer1
      ? await this.referrerRepository.findOne({ where: { referredUser: referrer1.referrer } ,relations:['referrer','referredUser']})
      : null;

    // if(referrer){
    //   console.log(tradeAmount)


    //   const levelOneBonus = tradeAmount * 0.05;
    //   console.log(referrer)
  
    //   const useId1 = referrer.referrer.id;
    //   console.log(useId1)
    //   const wallet1 = await this.walletRepository
    //     .createQueryBuilder('w')
    //     .where('w.userId = :useId1', { useId1 })
    //     .getOne();
    //   console.log(wallet1)
    //   if (wallet1) {
  
  
    //     const updatedAmount = parseFloat(wallet1.amount) + levelOneBonus;
    //     // const updatedFlows = parseFloat(wallet1.flows) + levelOneBonus;
    //     // console.log(updatedAmount)
  
  
    //     wallet1.amount = updatedAmount.toString();
    //    // wallet1.flows = updatedFlows.toString();
  
  
        
  
    //     await this.walletRepository.save(wallet1)
  
  
    //   }
  
  
  
  
    //   const bounusexis = await this.findByReferredBonusUserId(useId1)
    //   console.log(bounusexis)
  
    //   if (bounusexis) {
  
    //     const updatedbon = parseFloat(bounusexis.amount) + levelOneBonus;
  
    //     bounusexis.amount = updatedbon.toString();
  
  
    //     await this.referralBonusRepository.save(bounusexis);
  
  
  
    //   } else {
    //     const levelOneReferralBonus = this.referralBonusRepository.create({
    //       amount: levelOneBonus.toString(),
    //       user: referrer.referrer,
    //     });
    //     await this.referralBonusRepository.save(levelOneReferralBonus);
  
    //   }




    // }else 
    if(referrer1){

      console.log(tradeAmount)


      const levelOneBonus = tradeAmount * 0.05;
      console.log(referrer1)
  
      const useId1 = referrer1.referrer.id;
      console.log(useId1)
      const wallet1 = await this.walletRepository
        .createQueryBuilder('w')
        .where('w.userId = :useId1', { useId1 })
        .getOne();
      console.log(wallet1)
      if (wallet1) {
  
  
        const updatedAmount = parseFloat(wallet1.amount) + levelOneBonus;
        // const updatedFlows = parseFloat(wallet1.flows) + levelOneBonus;
        // console.log(updatedAmount)
  
  
        wallet1.amount = updatedAmount.toString();
       // wallet1.flows = updatedFlows.toString();
  
  
        
  
        await this.walletRepository.save(wallet1)
  
  
      }
  
  
  
  
      const bounusexis = await this.findByReferredBonusUserId(useId1)
      console.log(bounusexis)
  
      if (bounusexis) {
  
        const updatedbon = parseFloat(bounusexis.amount) + levelOneBonus;
  
        bounusexis.amount = updatedbon.toString();
        bounusexis.comment="level2"
  
  
        await this.referralBonusRepository.save(bounusexis);
  
  
  
      } else {
        const levelOneReferralBonus = this.referralBonusRepository.create({
          amount: levelOneBonus.toString(),
          user: referrer.referrer,
          comment:"level2"
        });
        await this.referralBonusRepository.save(levelOneReferralBonus);
  
      }


    }else if(referrer2){

      console.log(tradeAmount)


      const levelOneBonus = tradeAmount * 0.01;
      console.log(referrer2)
  
      const useId1 = referrer2.referrer.id;
      console.log(useId1)
      const wallet1 = await this.walletRepository
        .createQueryBuilder('w')
        .where('w.userId = :useId1', { useId1 })
        .getOne();
      console.log(wallet1)
      if (wallet1) {
  
  
        const updatedAmount = parseFloat(wallet1.amount) + levelOneBonus;
        // const updatedFlows = parseFloat(wallet1.flows) + levelOneBonus;
        // console.log(updatedAmount)
  
  
        wallet1.amount = updatedAmount.toString();
       // wallet1.flows = updatedFlows.toString();
  
  
        
  
        await this.walletRepository.save(wallet1)
  
  
      }
  
  
  
  
      const bounusexis = await this.findByReferredBonusUserId(useId1)
      console.log(bounusexis)
  
      if (bounusexis) {
  
        const updatedbon = parseFloat(bounusexis.amount) + levelOneBonus;
  
        bounusexis.amount = updatedbon.toString();
        bounusexis.amount="level3"
  
  
        await this.referralBonusRepository.save(bounusexis);
  
  
  
      } else {
        const levelOneReferralBonus = this.referralBonusRepository.create({
          amount: levelOneBonus.toString(),
          user: referrer.referrer,
          comment:"level3"
        });
        await this.referralBonusRepository.save(levelOneReferralBonus);
  


      
    }}


   






  }

  async handleFirstdepo(use: User, tradeAmount: number) {
    console.log(use)



    const referrer = await this.referrerRepository.findOne({ where: { referredUser: use } ,relations:['referrer','referredUser']})
    if(referrer==null){
      return;
    }


    console.log(tradeAmount)


    const levelOneBonus = tradeAmount * 0.1;
    console.log(referrer)

    const useId1 = referrer.referrer.id;
    console.log(useId1)
    const wallet1 = await this.walletRepository
      .createQueryBuilder('w')
      .where('w.userId = :useId1', { useId1 })
      .getOne();
    console.log(wallet1)
    if (wallet1) {


      const updatedAmount = parseFloat(wallet1.amount) + levelOneBonus;
      // const updatedFlows = parseFloat(wallet1.flows) + levelOneBonus;
      // console.log(updatedAmount)


      wallet1.amount = updatedAmount.toString();
     // wallet1.flows = updatedFlows.toString();


      

      await this.walletRepository.save(wallet1)


    }




    const bounusexis = await this.findByReferredBonusUserId(useId1)
    console.log(bounusexis)

    if (bounusexis) {

      const updatedbon = parseFloat(bounusexis.amount) + levelOneBonus;

      bounusexis.amount = updatedbon.toString();
      bounusexis.comment="deposit"


      await this.referralBonusRepository.save(bounusexis);



    } else {
      const levelOneReferralBonus = this.referralBonusRepository.create({
        amount: levelOneBonus.toString(),
        user: referrer.referrer,
        comment: "deposit",
      });
      await this.referralBonusRepository.save(levelOneReferralBonus);

    }






  }

  async getReferrerStatistics(referrerId: string): Promise<{
    active: number;
    total: number;
    totalAmount: number;
    totalAmountDeposits: number;
    totalAmountLevel2: number;
    totalAmountLevel3: number;
    referralCode: string;
  }> {
    const query = `
      SELECT
        (SELECT COUNT(user.id)
         FROM user
         INNER JOIN referrer AS r ON r.referredUserId = user.id
         WHERE r.referrerId = ?
           AND user.hasMadeFirstDeposit = true) AS active,
           
        (SELECT COUNT(*)
         FROM referrer AS r
         WHERE r.referrerId  = ?
           AND r.deleatedAt IS NULL) AS total,
           
        COALESCE(
           (SELECT SUM(rb.amount)
            FROM referral_bonus AS rb
            LEFT JOIN user AS u ON rb.referredUserId  = u.id
            WHERE u.id = ?
              AND rb.deleatedAt IS NULL), 0) AS totalamount,

        COALESCE(
           (SELECT SUM(rb.amount)
            FROM referral_bonus AS rb
            LEFT JOIN user AS u ON rb.referredUserId  = u.id
            WHERE u.id = ? AND rb.comment = 'deposit'
              AND rb.deleatedAt IS NULL), 0) AS totalAmountDeposits,

        COALESCE(
           (SELECT SUM(rb.amount)
            FROM referral_bonus AS rb
            LEFT JOIN user AS u ON rb.referredUserId  = u.id
            WHERE u.id = ? AND rb.comment = 'level2'
              AND rb.deleatedAt IS NULL), 0) AS totalAmountLevel2,
           
        COALESCE(
           (SELECT SUM(rb.amount)
            FROM referral_bonus AS rb
            LEFT JOIN user AS u ON rb.referredUserId  = u.id
            WHERE u.id = ? AND rb.comment = 'level3'
              AND rb.deleatedAt IS NULL), 0) AS totalAmountLevel3,

        (SELECT u.referralCode
         FROM user AS u
         WHERE u.id = ?
           AND u.deleatedAt IS NULL) AS referralCode;
    `;

    const params = [referrerId, referrerId, referrerId, referrerId, referrerId, referrerId, referrerId, referrerId];

    const results = await this.referralBonusRepository.query(query, params);

    return {
      active: results[0].active,
      total: results[0].total,
      totalAmount: results[0].totalamount,
      totalAmountDeposits: results[0].totalAmountDeposits,
      totalAmountLevel2: results[0].totalAmountLevel2,
      totalAmountLevel3: results[0].totalAmountLevel3,
      referralCode: results[0].referralCode,
    };
  }

// async getReferrerStatistics(referrerId: string): Promise<{ active: number; total: number; totalAmount: string; referralCode: string }> {
//   const [activeCount, totalCount, totalAmountResult, referralCodeResult] = await Promise.all([
//     // Count active users who have made the first deposit
//     await this.userRepository
//     .createQueryBuilder('user')
//     .select('COUNT(user.id)', 'deposit_count')
//     .innerJoin('referrer', 'r', 'r.referredUserId = user.id')
//     .where('r.referrerId = :referrerId', { referrerId })
//     .andWhere('user.hasMadeFirstDeposit = :hasMadeFirstDeposit', { hasMadeFirstDeposit: true })
//     .getCount(),

//     // Count total referrals
//     this.referrerRepository.createQueryBuilder('r')
//       .where('r.referrer = :referrerId', { referrerId })
//       .andWhere('r.deleatedAt IS NULL')
//       .getCount(),

//     // Calculate the total amount of referral bonuses for the referrer
//     this.referralBonusRepository.createQueryBuilder('rb')
//       .select('SUM(rb.amount)', 'total_amount')
//       .leftJoin('rb.user', 'u')
//       .where('u.id = :referrerId', { referrerId })
//       .andWhere('rb.deleatedAt IS NULL')
//       .getRawOne(),

//     // Get the referral code of the referrer
//     this.userRepository.createQueryBuilder('u')
//       .select('u.referralCode', 'referral_code')
//       .where('u.id = :referrerId', { referrerId })
//       .andWhere('u.deleatedAt IS NULL')
//       .getRawOne(),
//   ]);

//   return {
//     active: activeCount,
//     total: totalCount,
//     totalAmount: totalAmountResult.total_amount,
//     referralCode: referralCodeResult.referral_code,
//   };
// }

  
  
  
  




  create(createReferralDto: CreateReferralDto) {
    return 'This action adds a new referral';
  }

  findAll() {
    return `This action returns all referrals`;
  }

  findOne(id: number) {
    return `This action returns a #${id} referral`;
  }

  update(id: number, updateReferralDto: UpdateReferralDto) {
    return `This action updates a #${id} referral`;
  }

  remove(id: number) {
    return `This action removes a #${id} referral`;
  }
}