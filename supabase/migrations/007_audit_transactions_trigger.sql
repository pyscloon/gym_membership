-- 1. Create the universal trigger function for transactions
CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_name VARCHAR(100);
  row_data JSONB;
BEGIN
  -- Handle DELETES
  IF (TG_OP = 'DELETE') THEN
    action_name := 'TRANSACTION_DELETED';
    row_data := jsonb_build_object('old', row_to_json(OLD));
    
    INSERT INTO public.audit_logs (actor_id, action_type, target_id, target_table, payload)
    VALUES (auth.uid(), action_name, OLD.id::VARCHAR, 'transactions', row_data);
    
    RETURN OLD;
    
  -- Handle UPDATES (e.g., An Admin approving a cash payment)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Differentiate the action name if the status specifically was changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      action_name := 'TRANSACTION_STATUS_CHANGED';
    ELSE
      action_name := 'TRANSACTION_UPDATED';
    END IF;
    
    -- Store both the before and after state
    row_data := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
    
    INSERT INTO public.audit_logs (actor_id, action_type, target_id, target_table, payload)
    VALUES (auth.uid(), action_name, NEW.id::VARCHAR, 'transactions', row_data);
    
    RETURN NEW;
    
  -- Handle INSERTS (e.g., A user initiating a new payment)
  ELSIF (TG_OP = 'INSERT') THEN
    action_name := 'TRANSACTION_CREATED';
    row_data := jsonb_build_object('new', row_to_json(NEW));
    
    INSERT INTO public.audit_logs (actor_id, action_type, target_id, target_table, payload)
    VALUES (auth.uid(), action_name, NEW.id::VARCHAR, 'transactions', row_data);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER ensures this function runs with admin privileges, 
-- guaranteeing the audit log is saved even if the user has limited database access.

-- 2. Attach the trigger to the transactions table
DROP TRIGGER IF EXISTS transactions_audit_trigger ON public.transactions;

CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();
