from fastapi import APIRouter, HTTPException
import duckdb
from app.services.analysis import analysis_service
from app.services.api_data import dataset_meta,dataset_stats,field_quality,preview,wallet_to_frontend,ip_to_frontend
from app.services.graph import GraphService, EntityNotFoundError
from app.services.paths import NORMALIZED_STORAGE_ROOT

router=APIRouter(prefix='/api/v1')
graph=GraphService()

@router.get('/dataset/meta')
def meta(): return dataset_meta()
@router.get('/dataset/stats')
def stats(): return dataset_stats()
@router.get('/dataset/quality')
def quality(): return field_quality()
@router.get('/dataset/preview')
def dataset_preview(page:int=1,pageSize:int=10): return preview(page,pageSize)

@router.get('/entities/wallets')
def wallets(): return [wallet_to_frontend(x) for x in analysis_service.get_state().wallet_features.entity_id.tolist()]
@router.get('/entities/wallet/{id}')
def wallet(id:str):
 x=wallet_to_frontend(id)
 if x is None: raise HTTPException(404,'Wallet not found')
 return x
@router.get('/entities/ip/{id}')
def ip(id:str):
 x=ip_to_frontend(id)
 if x is None: raise HTTPException(404,'IP not found')
 return x
@router.get('/entities/ips')
def ips(): return [ip_to_frontend(x) for x in analysis_service.get_state().ip_features.entity_id.tolist()]
@router.get('/entities/{entity_id}/evidence')
def evidence(entity_id:str): return analysis_service.get_state().evidence.get(entity_id,[])
@router.get('/entities/{entity_id}/indicators')
def indicators(entity_id:str):
 s=analysis_service.get_state(); r=s.wallet_features[s.wallet_features.entity_id==entity_id]
 if r.empty:return []
 x=r.iloc[0]
 vals=[('Transaction velocity',min(float(x.transactions_per_day)/50,1)),('Network diversity',min(int(x.unique_ip_count)/5,1)),('Amount activity',min(float(x.total_volume)/100,1))]
 return [{'label':a,'value':round(v,3),'deviation':round(v,3),'status':'anomalous' if v>.7 else 'elevated' if v>.45 else 'normal'} for a,v in vals]
@router.get('/entities/{entity_id}/findings')
def findings(entity_id:str): return analysis_service.get_state().findings.get(entity_id,[])
@router.get('/entities/{entity_id}/timeline')
def timeline(entity_id:str): return analysis_service.get_state().timelines.get(entity_id,[])

@router.get('/graph')
def graph_all():
  g = graph.get_graph()
  state = analysis_service.get_state()

  MAX_NODES = 5000
  MAX_EDGES = 10000

  # Build wallet -> cluster lookup from the actual analysis result.
  # Noise wallets (cluster_label == -1) simply won't have a clusterId.
  wallet_cluster = {}

  for cluster in (state.clusters or []):
    cluster_id = cluster.get('id')
    if not cluster_id:
      continue

    for wallet_id in cluster.get('memberWalletIds', []):
      wallet_cluster[str(wallet_id)] = str(cluster_id)

  # Deterministic edge-first sampling.
  ordered = list(g.edges(keys=True, data=True))
  ordered.sort(key=lambda e: (str(e[0]), str(e[1]), str(e[2])))

  seen: set[str] = set()
  node_ids: list[str] = []
  selected: list[tuple] = []

  for u, v, k, a in ordered:
    if len(selected) >= MAX_EDGES:
      break

    fresh = [x for x in (u, v) if x not in seen]

    if len(seen) + len(fresh) > MAX_NODES:
      continue

    for x in fresh:
      seen.add(x)
      node_ids.append(x)

    selected.append((u, v, k, a))

  nodes = []

  for n in node_ids:
    a = g.nodes[n]
    node_type = a.get('type')

    node = {
      'id': n,
      'label': a.get('entity_id', n),
      'type': node_type,
      'shape': (
        'circle'
        if node_type == 'wallet'
        else 'square'
        if node_type == 'transaction'
        else 'diamond'
      ),
      'x': 0,
      'y': 0,
      'connections': g.degree(n),
    }

    # Attach real cluster membership to wallet nodes.
    if node_type == 'wallet':
      wallet_id = str(a.get('entity_id', n))
      cluster_id = wallet_cluster.get(wallet_id)

      if cluster_id:
        node['clusterId'] = cluster_id

    nodes.append(node)

  edges = []

  for i, (u, v, k, a) in enumerate(selected):
    kind = (
      'wallet-wallet'
      if a.get('relationship') == 'common_input_association'
      else 'ip-tx'
      if a.get('relationship') == 'observed_transaction'
      else 'wallet-tx'
      if (
        a.get('relationship_class') == 'transaction_wallet'
        and a.get('wallet_role') == 'input'
      )
      else 'tx-wallet'
    )

    edges.append({
      'id': f'E-{i}',
      'source': u,
      'target': v,
      'label': a.get('relationship', 'observed'),
      'amount': a.get('amount'),
      'timestamp': a.get('timestamp'),
      'kind': kind
    })

  # Total clusters comes directly from the completed analysis.
  represented_clusters = sorted({
    node['clusterId']
    for node in nodes
    if node.get('clusterId')
  })

  return {
    'nodes': nodes,
    'edges': edges,
    'clusterCount': len(state.clusters or []),
    'representedClusterCount': len(represented_clusters),
    'representedClusters': represented_clusters
  }
@router.get('/transactions')
def transactions():
 s=analysis_service.get_state(); g=graph.get_graph(); out=[]
 for n,a in g.nodes(data=True):
  if a.get('type')!='transaction':continue
  out.append({'id':a.get('txid',a.get('entity_id')),'txid':a.get('txid',a.get('entity_id')),'timestamp':a.get('first_seen'),'amount':float(sum(a.get('output_amounts',[]))),'fee':a.get('fee',0),'scriptType':a.get('script_type'),'inputAddresses':list(a.get('input_wallets',[])),'outputAddresses':list(a.get('output_wallets',[])),'srcIp':(a.get('src_ips') or [''])[0],'dstIp':(a.get('dst_ips') or [''])[0],'srcPort':(a.get('src_ports') or [0])[0],'dstPort':(a.get('dst_ports') or [0])[0],'anomalyScore':0,'relatedWallets':list(set(a.get('input_wallets',[]))|set(a.get('output_wallets',[])))})
  if len(out)>=500:break
 return out
@router.get('/transactions/flow-patterns')
def flow_patterns(): return analysis_service.get_state().flow_patterns
@router.get('/search')
def search(q:str=''):
 if not q.strip(): return []
 q=q.lower(); s=analysis_service.get_state(); out=[]
 for x in s.leads:
  if q in x['entityId'].lower() or q in x['entityLabel'].lower() or q in x.get('clusterId','').lower(): out.append({'id':x['entityId'],'label':x['entityLabel'],'type':x['type'],'description':'Investigative lead'})
 for x in s.patterns[:50]:
  if q in x['id'].lower() or q in x['description'].lower(): out.append({'id':x['id'],'label':x['id'],'type':'transaction','description':x['description']})
 return out[:30]

