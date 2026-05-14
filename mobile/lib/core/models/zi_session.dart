// Core domain models — mirrors the TypeScript types in ziorbit-web/src/core/types/core.ts
// Same field names so the same JSON from /api/v1/auth/session works in both.

class ZiIndividual {
  final String id;
  final String ziCode;
  final String fullName;
  final String email;
  final String? mobile;
  final String? avatarUrl;
  final String preferredLang;

  const ZiIndividual({
    required this.id,
    required this.ziCode,
    required this.fullName,
    required this.email,
    this.mobile,
    this.avatarUrl,
    required this.preferredLang,
  });

  factory ZiIndividual.fromJson(Map<String, dynamic> j) => ZiIndividual(
    id:            j['id'] as String,
    ziCode:        j['zi_code'] as String,
    fullName:      j['full_name'] as String,
    email:         j['email'] as String,
    mobile:        j['mobile'] as String?,
    avatarUrl:     j['avatar_url'] as String?,
    preferredLang: j['preferred_lang'] as String? ?? 'en',
  );
}

class ZiEntity {
  final String id;
  final String ziCode;
  final String entityName;
  final String entityType;
  final String? gstin;
  final String? logoUrl;

  const ZiEntity({
    required this.id,
    required this.ziCode,
    required this.entityName,
    required this.entityType,
    this.gstin,
    this.logoUrl,
  });

  factory ZiEntity.fromJson(Map<String, dynamic> j) => ZiEntity(
    id:         j['id'] as String,
    ziCode:     j['zi_code'] as String,
    entityName: j['entity_name'] as String,
    entityType: j['entity_type'] as String,
    gstin:      j['gstin'] as String?,
    logoUrl:    j['logo_url'] as String?,
  );
}

class ZiSubscription {
  final String id;
  final String ziCode;
  final String entityId;
  final String productCode;
  final String status;

  const ZiSubscription({
    required this.id,
    required this.ziCode,
    required this.entityId,
    required this.productCode,
    required this.status,
  });

  factory ZiSubscription.fromJson(Map<String, dynamic> j) => ZiSubscription(
    id:          j['id'] as String,
    ziCode:      j['zi_code'] as String,
    entityId:    j['entity_id'] as String,
    productCode: j['product_code'] as String,
    status:      j['status'] as String,
  );
}

class ZiSession {
  final ZiIndividual individual;
  final List<ZiEntity> entities;
  final ZiEntity? activeEntity;
  final List<ZiSubscription> activeSubscriptions;
  final String? lastProductCode;

  const ZiSession({
    required this.individual,
    required this.entities,
    this.activeEntity,
    required this.activeSubscriptions,
    this.lastProductCode,
  });

  factory ZiSession.fromJson(Map<String, dynamic> j) => ZiSession(
    individual:          ZiIndividual.fromJson(j['individual'] as Map<String, dynamic>),
    entities:            (j['entities'] as List<dynamic>? ?? [])
                           .map((e) => ZiEntity.fromJson(e as Map<String, dynamic>))
                           .toList(),
    activeEntity:        j['activeEntity'] != null
                           ? ZiEntity.fromJson(j['activeEntity'] as Map<String, dynamic>)
                           : null,
    activeSubscriptions: (j['activeSubscriptions'] as List<dynamic>? ?? [])
                           .map((s) => ZiSubscription.fromJson(s as Map<String, dynamic>))
                           .toList(),
    lastProductCode:     j['lastProductCode'] as String?,
  );

  ZiSubscription? subscriptionFor(String productCode) =>
      activeSubscriptions.where((s) => s.productCode == productCode).firstOrNull;
}
