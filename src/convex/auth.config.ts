export default {
  providers: [
    {
      // Password provider is self-hosted inside the Convex deployment,
      // so it needs no external OAuth domain.
      applicationID: "convex",
      provider: "password",
    },
  ],
};
