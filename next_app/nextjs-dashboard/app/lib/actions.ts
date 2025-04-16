'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { z } from 'zod';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export type State = {
  errors?: {
    customerId?: string[];
    amount?:     string[];
    status?:     string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
  id:         z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount:     z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  date:       z.string(),
  status:     z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export const createInvoice = async(prevState: State, formData: FormData) => {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount:     formData.get('amount'),
    status:     formData.get('status'),
  });

  // 入力値の確認
  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCent = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try{
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCent}, ${status}, ${date})
    `;
  } catch(e) {
    console.log(e)
  }
  // 更新後のデータを反映するため、ブラウザのキャッシュを削除する
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export const updateInvoice = async(id: string, prevState: State, formData: FormData) => {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount:     formData.get('amount'),
    status:     formData.get('status'),
  });

  if(!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    }
  }
  const {customerId, amount, status} = validatedFields.data;
  const amountInCents = amount * 100;

  try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch(e) {
    console.log(e);
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export const deleteInvoice = async(id: string, formData: FormData) => {
  try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  }catch(e) {
    console.log(e)
  }
  revalidatePath('dashboard/invoices');
}
