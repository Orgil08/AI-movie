/**
 * AI MOVIE - Дансаар шилжүүлэх (Direct Bank Transfer) төлбөрийн мэдээлэл
 * Данс: 5132104221
 * Эзэмшигч: Сүхбат Мөнх-Оргил (sukhbat munkh-orgil)
 * Банк: Хаан Банк (Khan Bank)
 */

export interface BankAccountDetails {
  bankName: string;
  bankNameEn: string;
  accountNumber: string;
  accountHolder: string;
  accountHolderEn: string;
  branch: string;
  noteInstructionMn: string;
  supportedBanks: string[];
}

export const BANK_TRANSFER_DETAILS: BankAccountDetails = {
  bankName: 'Хаан Банк (Khan Bank)',
  bankNameEn: 'Khan Bank',
  accountNumber: '5132104221',
  accountHolder: 'Сүхбат Мөнх-Оргил',
  accountHolderEn: 'sukhbat munkh-orgil',
  branch: 'Төв салбар',
  noteInstructionMn: 'Гүйлгээний утга дээр захиалгын дугаар болон утасны дугаараа заавал бичнэ үү.',
  supportedBanks: [
    'Хаан Банк',
    'Голомт Банк',
    'Худалдаа Хөгжлийн Банк (ХХБ)',
    'Төрийн Банк',
    'ХасБанк',
    'Монгол Шуудан Банк',
    'Ард Апп',
    'SocialPay',
    'Most Money'
  ]
};
