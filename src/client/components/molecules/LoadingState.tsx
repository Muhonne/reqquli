import { Spinner, Stack, Text } from '../atoms'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ 
  message = 'Loading...', 
  className = ''
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <Stack spacing="md" className="text-center">
        <Spinner className="mx-auto" />
        <Text color="muted" variant="small">
          {message}
        </Text>
      </Stack>
    </div>
  )
}