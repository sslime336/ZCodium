interface RootStartupLoadingVisibilityState {
  isDesktop: boolean | undefined;
  isRestoring: boolean;
  isBootstrappingInitialWorkspace: boolean;
}

interface FallbackWorkspaceCreateState {
  isMounted: boolean;
  activeWorkspacePath: string | null;
}

export function shouldShowRootStartupLoading(
  state: RootStartupLoadingVisibilityState,
): boolean {
  return (
    Boolean(state.isDesktop) && (state.isRestoring || state.isBootstrappingInitialWorkspace)
  );
}

export function shouldOpenFallbackWorkspaceAfterCreate(
  state: FallbackWorkspaceCreateState,
): boolean {
  return state.isMounted && !state.activeWorkspacePath;
}
