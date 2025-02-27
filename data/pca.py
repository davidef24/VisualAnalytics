import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler


# Define the columns to drop
columns_to_drop = [
    "player_url", "fifa_update", "fifa_update_date", "potential",
    "club_position", "club_jersey_number", "club_loaned_from", "club_joined_date", "club_contract_valid_until_year",
    "nation_team_id", "nation_jersey_number", "work_rate", "body_type", "release_clause_eur",
    "ls", "st", "rs", "lw", "lf", "cf", "rf", "rw", "lam", "cam", "ram", "lm", "lcm", "cm", "rcm", "rm",
    "lwb", "ldm", "cdm", "rdm", "rwb", "lb", "lcb", "cb", "rcb", "rb", "gk", "nation_position", "player_tags", "player_traits"
]

# Load dataset (update file_path with your actual file)
file_path = "data/male_players (legacy)_23.csv"  # Change this to the actual dataset file
df = pd.read_csv(file_path)

## Filter only FIFA 23 players
df = df[df["fifa_version"] == 23]

# Drop the unwanted columns
df_cleaned = df.drop(columns=columns_to_drop, errors='ignore')

# Drop rows where 'value_eur' is null
df_cleaned = df_cleaned.dropna(subset=["value_eur"])

# Save the cleaned dataset
df_cleaned.to_csv("cleaned_players.csv", index=False)

df_cleaned.info()



#
## Standardize features
#scaler = StandardScaler()
#df_scaled = scaler.fit_transform(df_numeric)
#
## Apply PCA (reduce to 2 components)
#pca = PCA(n_components=2)
#df_pca = pca.fit_transform(df_scaled)
#
## Create a DataFrame with PCA results
#df_pca = pd.DataFrame(df_pca, columns=["PC1", "PC2"])
#
## Visualize clusters
#plt.figure(figsize=(10, 6))
#sns.scatterplot(x=df_pca["PC1"], y=df_pca["PC2"], alpha=0.7)
#plt.xlabel("Principal Component 1")
#plt.ylabel("Principal Component 2")
#plt.title("PCA Clustering of FIFA 23 Players")
#plt.show()
#