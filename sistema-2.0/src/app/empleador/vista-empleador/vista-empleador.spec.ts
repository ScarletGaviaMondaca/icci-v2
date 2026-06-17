import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaEmpleador } from './vista-empleador';

describe('VistaEmpleador', () => {
  let component: VistaEmpleador;
  let fixture: ComponentFixture<VistaEmpleador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaEmpleador],
    }).compileComponents();

    fixture = TestBed.createComponent(VistaEmpleador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
