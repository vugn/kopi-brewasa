CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

INSERT INTO public.profiles (id, username, role)
SELECT
    users.id,
    users.email,
    'admin'
FROM auth.users AS users
WHERE users.email IS NOT NULL
  AND users.email NOT LIKE '%@brewasa.com'
  AND NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = users.id
         OR profiles.username = users.email
  )
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Enable all access for authenticated users on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Enable ALL access for authenticated users on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

CREATE POLICY "Authenticated users can read transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Enable ALL access for authenticated users on transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can read transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can insert transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can update transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can delete transaction items" ON public.transaction_items;

CREATE POLICY "Authenticated users can read transaction items"
ON public.transaction_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert transaction items"
ON public.transaction_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transaction items"
ON public.transaction_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transaction items"
ON public.transaction_items
FOR DELETE
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.delete_transaction_with_restore(transaction_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    t_item record;
    recipe_item record;
    restore_qty numeric;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Hanya admin yang dapat menghapus transaksi.'
            USING ERRCODE = '42501';
    END IF;

    FOR t_item IN
        SELECT *
        FROM public.transaction_items
        WHERE transaction_id = transaction_uuid
    LOOP
        FOR recipe_item IN
            SELECT *
            FROM public.menu_recipes
            WHERE menu_item_id = t_item.menu_item_id
        LOOP
            restore_qty := recipe_item.quantity_required * t_item.quantity;

            UPDATE public.ingredients
            SET current_stock = current_stock + restore_qty
            WHERE id = recipe_item.ingredient_id;

            INSERT INTO public.stock_logs (ingredient_id, change_amount, reason, notes)
            VALUES (
                recipe_item.ingredient_id,
                restore_qty,
                'void',
                'Transaction deleted: ' || t_item.item_name
            );
        END LOOP;
    END LOOP;

    DELETE FROM public.transactions
    WHERE id = transaction_uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_transaction_with_restore(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transaction_with_restore(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_transaction_with_restore(uuid) TO authenticated;
