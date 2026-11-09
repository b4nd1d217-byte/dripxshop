
-- Admin-only deletion of ticket conversations and safe product retirement.
CREATE OR REPLACE FUNCTION public.dripx_admin_delete_ticket(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_ticket public.tickets%rowtype; v_order_status text; v_messages integer := 0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.dripx_is_admin() THEN RAISE EXCEPTION 'Solo administración puede eliminar tickets.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket no encontrado.' USING ERRCODE='P0002'; END IF;
 IF v_ticket.order_id IS NOT NULL THEN SELECT o.status INTO v_order_status FROM public.orders o WHERE o.id=v_ticket.order_id; END IF;
 SELECT count(*) INTO v_messages FROM public.ticket_messages WHERE ticket_id=p_ticket_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'ticket.deleted.by_admin','ticket',p_ticket_id,jsonb_build_object('category',v_ticket.category,'subject',left(v_ticket.subject,120),'order_id',v_ticket.order_id,'order_status_at_deletion',v_order_status,'ticket_status',v_ticket.status,'messages_deleted',v_messages,'purchase_preserved',v_ticket.order_id IS NOT NULL));
 DELETE FROM public.ticket_messages WHERE ticket_id=p_ticket_id;
 DELETE FROM public.tickets WHERE id=p_ticket_id;
 RETURN jsonb_build_object('deleted',true,'ticket_id',p_ticket_id,'messages_deleted',v_messages,'purchase_preserved',v_ticket.order_id IS NOT NULL,'order_status',v_order_status);
END; $function$;
CREATE OR REPLACE FUNCTION public.admin_delete_ticket(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_ticket public.tickets%rowtype; v_order_status text; v_messages integer := 0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ticket_not_found' USING ERRCODE='P0002'; END IF;
 IF v_ticket.order_id IS NOT NULL THEN SELECT status INTO v_order_status FROM public.orders WHERE id=v_ticket.order_id; END IF;
 SELECT count(*) INTO v_messages FROM public.ticket_messages WHERE ticket_id=p_ticket_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'ticket.deleted.by_admin','ticket',p_ticket_id,jsonb_build_object('category',v_ticket.category,'subject',left(v_ticket.subject,120),'order_id',v_ticket.order_id,'order_status_at_deletion',v_order_status,'ticket_status',v_ticket.status,'messages_deleted',v_messages,'purchase_preserved',v_ticket.order_id IS NOT NULL));
 DELETE FROM public.ticket_messages WHERE ticket_id=p_ticket_id;
 DELETE FROM public.tickets WHERE id=p_ticket_id;
 RETURN jsonb_build_object('deleted',true,'ticket_id',p_ticket_id,'messages_deleted',v_messages,'purchase_preserved',v_ticket.order_id IS NOT NULL,'order_status',v_order_status);
END; $function$;
REVOKE ALL ON FUNCTION public.dripx_admin_delete_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dripx_admin_delete_ticket(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_ticket(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.dripx_admin_delete_catalog_item(p_product_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_product public.dripx_products%rowtype; v_has_history boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.dripx_is_admin() THEN RAISE EXCEPTION 'Solo administración puede eliminar productos.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_product FROM public.dripx_products WHERE id=p_product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado.' USING ERRCODE='P0002'; END IF;
 v_has_history := v_product.file_path IS NOT NULL OR v_product.image_path IS NOT NULL OR v_product.video_path IS NOT NULL
 OR EXISTS(SELECT 1 FROM public.dripx_order_items WHERE product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_entitlements WHERE product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_user_plans WHERE product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_reviews WHERE product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_resource_licenses WHERE product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_plan_resources WHERE plan_product_id=p_product_id OR resource_product_id=p_product_id)
 OR EXISTS(SELECT 1 FROM public.dripx_user_plan_resources WHERE resource_product_id=p_product_id);
 IF v_has_history THEN
  UPDATE public.dripx_products SET status='archived',updated_at=now() WHERE id=p_product_id;
  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'catalog.item.archived_on_delete','product',p_product_id,jsonb_build_object('title',v_product.title,'reason','Se conserva historial, licencias, asignaciones y archivos.'));
  RETURN jsonb_build_object('ok',true,'deleted',false,'archived',true,'product_id',p_product_id,'message','Elemento retirado del catálogo; historial y accesos conservados.');
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(),'catalog.item.deleted','product',p_product_id,jsonb_build_object('title',v_product.title,'category',v_product.category,'product_type',v_product.product_type));
 DELETE FROM public.dripx_products WHERE id=p_product_id;
 RETURN jsonb_build_object('ok',true,'deleted',true,'archived',false,'product_id',p_product_id,'message','Elemento eliminado.');
END; $function$;
REVOKE ALL ON FUNCTION public.dripx_admin_delete_catalog_item(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dripx_admin_delete_catalog_item(uuid) TO authenticated;
