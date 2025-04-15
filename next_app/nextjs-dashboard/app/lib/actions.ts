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

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export const updateInvoice = async(id: string, formData: FormData) => {
  const {customerId, amount, status} = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount:     formData.get('amount'),
    status:     formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export const deleteInvoice = async(id: string, formData: FormData) => {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('dashboard/invoices');
}
