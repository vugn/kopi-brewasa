-- Migration: Add Function to Delete Transaction and Restore Stock
-- Run this in Supabase SQL Editor

create or replace function public.delete_transaction_with_restore(transaction_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
    t_item record;
    recipe_item record;
    restore_qty numeric;
begin
    -- 1. Restore Stock
    -- Loop through all items in the transaction
    for t_item in 
        select * from public.transaction_items where transaction_id = transaction_uuid
    loop
        -- For each sold item, find its recipe
        for recipe_item in 
            select * from public.menu_recipes where menu_item_id = t_item.menu_item_id
        loop
            -- Calculate total to restore: recipe qty * sold qty
            restore_qty := recipe_item.quantity_required * t_item.quantity;

            -- Increase inventory
            update public.ingredients
            set current_stock = current_stock + restore_qty
            where id = recipe_item.ingredient_id;

            -- Log the movement
            insert into public.stock_logs (ingredient_id, change_amount, reason, notes)
            values (
                recipe_item.ingredient_id, 
                restore_qty, 
                'void', 
                'Transaction deleted: ' || t_item.item_name
            );
        end loop;
    end loop;

    -- 2. Delete Transaction
    -- Assuming transaction_items has ON DELETE CASCADE constraint referencing transactions.
    -- If not, we should delete items first: delete from public.transaction_items where transaction_id = transaction_uuid;
    delete from public.transactions where id = transaction_uuid;
end;
$$;
