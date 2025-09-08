/**
 * Base abstract class for all commands
 * @template TResult The type of result the command returns
 * @template TParams The type of parameters the command accepts
 */
export abstract class Command<TResult, TParams = void> {
	/**
	 * Execute the command with the given parameters
	 * @param params The parameters for the command
	 * @returns The result of the command execution
	 */
	abstract execute(params: TParams): Promise<TResult>;
}
