
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xglpvmtqwxseglychjhr.supabase.co';
const supabaseAnonKey = 'sb_publishable_o-wZ9sIKkceI0RfEJ4doRw_wXwVvRv7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
