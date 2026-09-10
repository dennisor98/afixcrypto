import { DefaultEntity } from "src/entity";
import { Column, Entity } from "typeorm";
@Entity()

export class Mailer extends DefaultEntity{


  @Column({ nullable: true })
  otp: string;

  @Column({ unique: true, type: String })
  email: string;

}
