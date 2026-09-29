export interface Environment {
  readonly production: boolean;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}
