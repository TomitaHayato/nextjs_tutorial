'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id:         z.string(),
  customerId: z.string(),
  amount:     z.coerce.number(),
  date:       z.string(),
  status:     z.enum(['pending', 'paid']),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export const createInvoice = async(formData: FormData) => {
  const {customerId, amount, status} = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount:     formData.get('amount'),
    status:     formData.get('status'),
  });
  const amountInCent = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCent}, ${status}, ${date})
  `;

  // 更新後のデータを反映するため、ブラウザのキャッシュを削除する
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
