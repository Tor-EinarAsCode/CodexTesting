let
    Source = Json.Document(Web.Contents("http://localhost:3000/api/dashboard")),
    Comparison = Table.FromRecords(Source[comparison]),
    Platform = Table.FromRecords(Source[platformDistribution]),
    Ownership = Table.FromRecords(Source[ownershipDistribution]),
    Compliance = Table.FromRecords(Source[complianceDistribution]),
    Applications = Source[trackedApps][applications],
    ExpandApplication = List.Transform(
        Applications,
        (app as record) => List.Transform(
            app[devices],
            (device as record) => Record.AddField(device, "application", app[name])
        )
    ),
    TrackedApps = Table.FromRecords(List.Combine(ExpandApplication)),
    Output = [
        comparison = Comparison,
        platform = Platform,
        ownership = Ownership,
        compliance = Compliance,
        tracked_apps = TrackedApps
    ]
in
    Output
