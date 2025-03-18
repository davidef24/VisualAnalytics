import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples

# Define the columns to drop
columns_to_drop = [
    "version", "club_kit_number", "club_rating", "club_league_id", "club_id",
     "club_jersey_number", "club_loaned_from", "club_joined", "club_contract_valid_until",
    "nation_team_id", "nation_jersey_number", "work_rate", "body_type", "release_clause",
     "country_position", "country_kit_number", "country_rating", "country_league_name", "country_league_id" 
]

# Load dataset (update file_path with your actual file)
#file_path = "data/male_players (legacy)_23.csv"  # Change this to the actual dataset file
file_path = "data/player-data-full.csv"
df = pd.read_csv(file_path)
## Filter only FIFA 23 players

df = df[df["overall_rating"] >= 65]
df2 = df.replace("", np.nan)  # Convert "" to NaN
df3 = df2.dropna(subset=["gk_diving","gk_handling","gk_kicking","gk_positioning","gk_reflexes"])  # Now drop NaNs
# Drop the unwanted columns
df_cleaned = df3.drop(columns=columns_to_drop, errors='ignore')

# Drop rows where 'value_eur' is null
df_cleaned = df_cleaned.dropna(subset=["value"])

# Define columns to exclude for PCA and K-Means
excluded_columns = [
    "player_id", "short_name", "dob", "positions",
    "league_id", "league_name", "league_level", "club_team_id", "club_name",
    "nationality_id", "club_league_name", 
    "full_name", "value", "wage", "play_styles"
]

# Drop the excluded columns
df_pca_kmeans = df_cleaned.drop(columns=excluded_columns, errors='ignore')

#df_cleaned_nogk = df_pca_kmeans.drop(columns=["goalkeeping_speed"], errors='ignore')
#df_cleaned_nogk = df_cleaned_nogk.dropna()
# Remove rows with any null values
#df_cleaned_gk1 = df_pca_kmeans.dropna(subset=["nationality_name"])
# Calculate the mean for only numeric columns
numeric_columns_original = df_cleaned.select_dtypes(include=[np.number]).columns
column_means_original = np.round(df_cleaned[numeric_columns_original].min())

numeric_columns_pca = df_pca_kmeans.select_dtypes(include=[np.number]).columns
column_means_pca = np.round(df_pca_kmeans[numeric_columns_pca].min())



# Fill the NaN values with the respective column means for only numeric columns
df_cleaned_pca = df_pca_kmeans.fillna(column_means_pca)
df_output = df_cleaned.fillna(column_means_original)

print(df_cleaned["club_league_name"].unique())

#print(df_cleaned_gk2.info())
# Columns to use for t-SNE
columns_for_tsne = [
    "crossing","finishing","heading_accuracy","short_passing","volleys","dribbling","curve",
    "fk_accuracy","long_passing","ball_control","acceleration","sprint_speed","agility","reactions",
    "balance","shot_power","jumping","stamina","strength","long_shots","aggression","interceptions","positioning",
    "vision","penalties","composure","defensive_awareness","standing_tackle","sliding_tackle"
]

# Select only the columns for t-SNE
df_for_tsne = df_cleaned_pca[columns_for_tsne]


## One-Hot Encoding of categorical features
#categorical_features = ["club_position"]
#df_preprocessed_nogk = pd.get_dummies(df_for_tsne, columns=categorical_features, drop_first=True)

# Standardize Data
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_for_tsne)  # Drop NaN to avoid errors

# First t-SNE Reduction: Perform t-SNE for Dimensionality Reduction to 2 Components (intermediate step)
from sklearn.manifold import TSNE
tsne_20 = TSNE(n_components=2, random_state=23)
final_components = tsne_20.fit_transform(df_scaled)

# Convert the output into a proper DataFrame
df_tsne = pd.DataFrame(data=final_components, columns=["Dim1", "Dim2"])

# Find Best K Using Silhouette Score
k_values = range(2, 10)
silhouette_scores = []

for k in k_values:
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(df_tsne)
    score = silhouette_score(df_tsne, cluster_labels)
    silhouette_scores.append(score)
    print(f"Silhouette Score for k={k}: {score:.4f}")

# Plot Silhouette Score vs. K
plt.figure(figsize=(10, 6))
plt.plot(k_values, silhouette_scores, marker='o', linestyle='dashed', color='blue')
plt.xlabel("Number of Clusters (K)")
plt.ylabel("Silhouette Score")
plt.title("Silhouette Score vs. Number of Clusters")
plt.xticks(k_values)
plt.grid(True)
plt.show()

# Choose best K (highest silhouette score)
best_k = k_values[np.argmax(silhouette_scores)]
print(f"\nBest Number of Clusters: {best_k}")

# Apply K-Means with Best K
kmeans = KMeans(n_clusters=best_k, random_state=23, n_init=10)
df_tsne["Cluster"] = kmeans.fit_predict(df_tsne[["Dim1", "Dim2"]])

# Copy the Tsne_Dim1, Tsne_Dim2, and Cluster columns from df_tsne into df_cleaned_gk
df_output[['Tsne_Dim1', 'Tsne_Dim2', 'Cluster']] = df_tsne[['Dim1', 'Dim2', 'Cluster']].values



# Plot t-SNE Clusters
plt.figure(figsize=(10, 6))
sns.scatterplot(x=df_tsne["Dim1"], y=df_tsne["Dim2"], hue=df_tsne["Cluster"], palette="tab20", alpha=0.7)
plt.xlabel("t-SNE Component 1")
plt.ylabel("t-SNE Component 2")
plt.title(f"t-SNE with K-Means Clusters (K={20})")
plt.legend(title="Cluster")
plt.show()

#print(df_cleaned.info())


# Save the cleaned dataset
df_output.to_csv("dashboard/players_with_tsne_and_clusters_data.csv", index=False)
print(df_cleaned["club_league_name"].unique)